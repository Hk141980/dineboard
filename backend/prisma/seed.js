// ============================================
// DineBoard — Database Seed
// Creates default subscription plans + super admin
// ============================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ---- Create Subscription Plans ----
  const plans = [
    {
      name: 'Starter',
      monthlyPrice: 999,
      yearlyPrice: 9999,
      commissionRate: 5.0,
      bookingCommission: 3.0,
      maxTables: 10,
      maxStaff: 5,
      maxMenuItems: 50,
      features: {
        menuManagement: true,
        orderManagement: true,
        tableBooking: true,
        basicReports: true,
        whatsappNotifications: true,
        aiChatbot: false,
        staffManagement: false,
        promoCodes: false,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
      },
    },
    {
      name: 'Pro',
      monthlyPrice: 2499,
      yearlyPrice: 24999,
      commissionRate: 3.0,
      bookingCommission: 2.0,
      maxTables: 30,
      maxStaff: 20,
      maxMenuItems: 200,
      features: {
        menuManagement: true,
        orderManagement: true,
        tableBooking: true,
        basicReports: true,
        whatsappNotifications: true,
        aiChatbot: true,
        staffManagement: true,
        promoCodes: true,
        advancedReports: true,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
      },
    },
    {
      name: 'Enterprise',
      monthlyPrice: 4999,
      yearlyPrice: 49999,
      commissionRate: 1.5,
      bookingCommission: 1.0,
      maxTables: 100,
      maxStaff: 50,
      maxMenuItems: 500,
      features: {
        menuManagement: true,
        orderManagement: true,
        tableBooking: true,
        basicReports: true,
        whatsappNotifications: true,
        aiChatbot: true,
        staffManagement: true,
        promoCodes: true,
        advancedReports: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        whiteLabel: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.name.toLowerCase() },
      update: plan,
      create: { id: plan.name.toLowerCase(), ...plan },
    });
    console.log(`  ✅ Plan created: ${plan.name}`);
  }

  // ---- Create Super Admin ----
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@dineboard.in';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'DineBoard@2024';
  const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

  await prisma.superAdmin.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      passwordHash: hashedPassword,
      name: 'DineBoard Admin',
    },
  });
  console.log(`  ✅ Super Admin created: ${superAdminEmail}`);

  // ---- Create Demo Restaurant (for testing) ----
  const demoOwnerPassword = await bcrypt.hash('demo@123', 12);

  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'tinas-fusion' },
    update: {},
    create: {
      name: "Tina's Fusion Kitchen",
      slug: 'tinas-fusion',
      phone: '+919876543210',
      email: 'tina@example.com',
      address: '123 MG Road, Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      openingTime: '10:00',
      closingTime: '23:00',
      primaryColor: '#FF6B35',
      tagline: 'Where Traditions Meet Innovation',
      description: 'A modern fusion restaurant blending Indian flavors with global cuisine.',
      cuisineType: 'Multi-Cuisine',
      bookingSlotMinutes: 60,
      diningMinutes: 45,
      cleaningMinutes: 15,
      subscriptionPlanId: 'pro',
      status: 'active',
    },
  });

  // Create demo owner
  await prisma.staff.upsert({
    where: { email: 'tina@example.com' },
    update: {},
    create: {
      tenantId: demoTenant.id,
      name: 'Tina Sharma',
      email: 'tina@example.com',
      phone: '+919876543210',
      passwordHash: demoOwnerPassword,
      role: 'owner',
    },
  });
  console.log('  ✅ Demo restaurant created: Tina\'s Fusion Kitchen');

  // Create demo menu items
  const menuItems = [
    { name: 'Paneer Tikka', description: 'Grilled cottage cheese with spices', price: 280, category: 'Starters', isVeg: true },
    { name: 'Chicken Tikka', description: 'Smoky grilled chicken pieces', price: 320, category: 'Starters', isVeg: false },
    { name: 'Dal Makhani', description: 'Slow-cooked black lentils in cream', price: 220, category: 'Main Course', isVeg: true },
    { name: 'Butter Chicken', description: 'Creamy tomato-based chicken curry', price: 320, category: 'Main Course', isVeg: false },
    { name: 'Veg Biryani', description: 'Fragrant basmati rice with vegetables', price: 250, category: 'Main Course', isVeg: true },
    { name: 'Chicken Biryani', description: 'Hyderabadi style dum biryani', price: 300, category: 'Main Course', isVeg: false },
    { name: 'Fish Tikka', description: 'Tandoori grilled fish fillets', price: 350, category: 'Main Course', isVeg: false },
    { name: 'Garlic Naan', description: 'Tandoori bread with fresh garlic', price: 60, category: 'Breads', isVeg: true },
    { name: 'Butter Naan', description: 'Soft tandoori bread with butter', price: 50, category: 'Breads', isVeg: true },
    { name: 'Gulab Jamun', description: 'Classic Indian milk-solid dessert', price: 80, category: 'Desserts', isVeg: true },
    { name: 'Rasmalai', description: 'Spongy milk dumplings in sweet cream', price: 100, category: 'Desserts', isVeg: true },
    { name: 'Masala Chai', description: 'Traditional Indian spiced tea', price: 40, category: 'Beverages', isVeg: true },
    { name: 'Fresh Lime Soda', description: 'Refreshing lime with soda', price: 60, category: 'Beverages', isVeg: true },
    { name: 'Mango Lassi', description: 'Thick mango yogurt drink', price: 90, category: 'Beverages', isVeg: true },
    { name: 'Raita', description: 'Cool yogurt with cucumber & spices', price: 60, category: 'Sides', isVeg: true },
  ];

  for (let i = 0; i < menuItems.length; i++) {
    await prisma.menuItem.create({
      data: {
        tenantId: demoTenant.id,
        ...menuItems[i],
        sortOrder: i + 1,
      },
    });
  }
  console.log(`  ✅ ${menuItems.length} demo menu items created`);

  // Create demo tables
  const tables = [
    { name: 'Table 1', capacity: 2, section: 'Indoor' },
    { name: 'Table 2', capacity: 2, section: 'Indoor' },
    { name: 'Table 3', capacity: 4, section: 'Indoor' },
    { name: 'Table 4', capacity: 4, section: 'Indoor' },
    { name: 'Table 5', capacity: 6, section: 'Indoor' },
    { name: 'Garden 1', capacity: 4, section: 'Outdoor' },
    { name: 'Garden 2', capacity: 6, section: 'Outdoor' },
    { name: 'VIP Booth', capacity: 8, section: 'VIP' },
    { name: 'Rooftop 1', capacity: 4, section: 'Rooftop' },
    { name: 'Rooftop 2', capacity: 6, section: 'Rooftop' },
  ];

  for (const table of tables) {
    await prisma.table.create({
      data: { tenantId: demoTenant.id, ...table },
    });
  }
  console.log(`  ✅ ${tables.length} demo tables created`);

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
