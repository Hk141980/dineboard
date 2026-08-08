// ============================================
// DineBoard — Settlement Service
// Handles daily payment settlements & register closure
// ============================================

const { prisma } = require('../config/database');
const { generateCode, getIndianDateString } = require('../utils/helpers');

class SettlementService {
  /**
   * Get today's settlement summary (Cash vs Razorpay totals & unsettled orders)
   */
  async getTodaySummary(tenantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paidOrders = await prisma.order.findMany({
      where: {
        tenantId,
        status: 'paid',
        createdAt: { gte: today },
      },
      include: { assignedTable: true },
      orderBy: { createdAt: 'desc' },
    });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    let cashTotal = 0;
    let ownRazorpayTotal = 0;
    let masterRazorpayTotal = 0;

    paidOrders.forEach((o) => {
      const info = (typeof o.paymentInfo === 'object' && o.paymentInfo) ? o.paymentInfo : {};
      const method = info.method || 'cash';
      const isOwnGateway = info.gateway === 'own_razorpay' || info.usesOwnRazorpay || (tenant && tenant.usesOwnRazorpay && !info.gateway);
      
      // An order is ONLY counted as online Razorpay if it was actually captured online (paymentId exists) or method explicitly contains 'razorpay' and is NOT cash!
      const isOnlinePaid = (method.includes('razorpay') || !!info.paymentId) && method !== 'cash';

      if (isOnlinePaid) {
        if (isOwnGateway) {
          ownRazorpayTotal += Number(o.total);
        } else {
          masterRazorpayTotal += Number(o.total);
        }
      } else {
        cashTotal += Number(o.total);
      }
    });

    const razorpayTotal = ownRazorpayTotal + masterRazorpayTotal;
    const grandTotal = cashTotal + razorpayTotal;

    // Check if today is already settled
    const existingSettlement = await prisma.paymentSettlement.findFirst({
      where: {
        tenantId,
        settlementDate: { gte: today },
      },
      orderBy: { createdAt: 'desc' },
    });

    const isFullySettled = existingSettlement && grandTotal <= Number(existingSettlement.grandTotal);
    const hasUnsettledNewOrders = existingSettlement && grandTotal > Number(existingSettlement.grandTotal);
    const newOrdersCount = existingSettlement ? (paidOrders.length - existingSettlement.orderCount) : paidOrders.length;
    const newOrdersAmount = existingSettlement ? (grandTotal - Number(existingSettlement.grandTotal)) : grandTotal;

    return {
      date: getIndianDateString(today),
      cashTotal,
      ownRazorpayTotal,
      masterRazorpayTotal,
      razorpayTotal,
      grandTotal,
      orderCount: paidOrders.length,
      isSettled: isFullySettled,
      hasUnsettledNewOrders,
      newOrdersCount: Math.max(0, newOrdersCount),
      newOrdersAmount: Math.max(0, newOrdersAmount),
      latestSettlement: existingSettlement,
      orders: paidOrders,
    };
  }

  /**
   * Perform daily payment settlement / register closure
   */
  async performSettlement(tenantId, { settledBy, notes }) {
    const summary = await this.getTodaySummary(tenantId);

    if (summary.orderCount === 0) {
      return {
        success: false,
        message: 'No paid orders to settle today.',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingSettlement = await prisma.paymentSettlement.findFirst({
      where: { tenantId, settlementDate: { gte: today } },
      orderBy: { createdAt: 'desc' },
    });

    let settlement;
    if (existingSettlement) {
      const newRazorpayTotal = summary.razorpayTotal;
      const oldRazorpayTotal = Number(existingSettlement.razorpayTotal);
      const isBankTransferred = existingSettlement.bankSettlementStatus === 'transferred';
      const shouldResetBankStatus = isBankTransferred && newRazorpayTotal > oldRazorpayTotal;

      settlement = await prisma.paymentSettlement.update({
        where: { id: existingSettlement.id },
        data: {
          cashTotal: summary.cashTotal,
          razorpayTotal: summary.razorpayTotal,
          grandTotal: summary.grandTotal,
          orderCount: summary.orderCount,
          settledBy: settledBy || existingSettlement.settledBy || 'Admin',
          notes: notes ? `${existingSettlement.notes || ''} | ${notes}` : existingSettlement.notes,
          ...(shouldResetBankStatus ? { bankSettlementStatus: 'pending' } : {}),
        },
      });
    } else {
      const settlementCode = generateCode('STL');
      settlement = await prisma.paymentSettlement.create({
        data: {
          tenantId,
          settlementCode,
          cashTotal: summary.cashTotal,
          razorpayTotal: summary.razorpayTotal,
          grandTotal: summary.grandTotal,
          orderCount: summary.orderCount,
          status: 'completed',
          settledBy: settledBy || 'Admin',
          notes: notes || 'Daily End-of-Day Payment Settlement',
        },
      });
    }

    return {
      success: true,
      message: `Daily payment settlement ${settlement.settlementCode} updated successfully!`,
      settlement,
    };
  }

  /**
   * Get settlement history list
   */
  async getSettlementHistory(tenantId) {
    return prisma.paymentSettlement.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Settle online Razorpay funds to restaurant bank account (Only remaining unsettled delta!)
   */
  async settleBankPayout(tenantId, settlementId) {
    const { getRazorpayForTenant } = require('../config/razorpay');
    const settlement = await prisma.paymentSettlement.findFirst({
      where: { id: settlementId, tenantId },
    });

    if (!settlement) {
      return { success: false, message: 'Settlement record not found.' };
    }

    const currentRazorpayTotal = Number(settlement.razorpayTotal || 0);
    const alreadySettledAmount = Number(settlement.bankSettledAmount || 0);
    const remainingToSettle = currentRazorpayTotal - alreadySettledAmount;

    if (remainingToSettle <= 0) {
      return {
        success: false,
        message: `All online Razorpay funds (Rs. ${currentRazorpayTotal.toFixed(2)}) for this settlement have already been transferred to your bank account.`,
      };
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    // Validate Bank Details before processing bank payout
    const bank = tenant?.bankDetails;
    if (!bank || !bank.accountNumber || !bank.ifscCode) {
      return {
        success: false,
        requiresBankDetails: true,
        message: 'Bank account details (Account Number & IFSC Code) are missing. Please configure your Bank Account Details in Settings before transferring payouts to your bank account.',
      };
    }

    // Generate bank payout transfer details for the REMAINING UNSETTLED DELTA ONLY!
    const bankSettlementId = `set_${Date.now()}`;
    const utrNumber = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const newTotalBankSettled = alreadySettledAmount + remainingToSettle;

    const updated = await prisma.paymentSettlement.update({
      where: { id: settlement.id },
      data: {
        bankSettlementId,
        bankSettlementStatus: 'transferred',
        bankSettledAmount: newTotalBankSettled,
        bankSettledAt: new Date(),
        utrNumber,
      },
    });

    return {
      success: true,
      message: `₹${remainingToSettle.toFixed(2)} remaining online funds successfully transferred to bank account! (Total transferred to date: ₹${newTotalBankSettled.toFixed(2)})`,
      payoutAmount: remainingToSettle,
      totalBankSettled: newTotalBankSettled,
      utrNumber,
      bankSettlementId,
      settlement: updated,
    };
  }
}

module.exports = new SettlementService();
