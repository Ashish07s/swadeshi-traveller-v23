import { PrismaClient, Role, VendorType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding...");
  const password = await bcrypt.hash("demo@123", 12);

  const users = await Promise.all([
    prisma.user.upsert({ where: { email: "admin@swadeshitraveller.com" }, update: {}, create: { name: "Admin User", email: "admin@swadeshitraveller.com", password, role: Role.admin } }),
    prisma.user.upsert({ where: { email: "sales@swadeshitraveller.com" }, update: {}, create: { name: "Priya Sharma", email: "sales@swadeshitraveller.com", password, role: Role.sales } }),
    prisma.user.upsert({ where: { email: "tickets@swadeshitraveller.com" }, update: {}, create: { name: "Rahul Verma", email: "tickets@swadeshitraveller.com", password, role: Role.ticket_admin } }),
    prisma.user.upsert({ where: { email: "logistics@swadeshitraveller.com" }, update: {}, create: { name: "Neha Singh", email: "logistics@swadeshitraveller.com", password, role: Role.logistics } }),
    prisma.user.upsert({ where: { email: "finance@swadeshitraveller.com" }, update: {}, create: { name: "Ravi Kumar", email: "finance@swadeshitraveller.com", password, role: Role.finance } }),
    prisma.user.upsert({ where: { email: "operations@swadeshitraveller.com" }, update: {}, create: { name: "Amit Joshi", email: "operations@swadeshitraveller.com", password, role: Role.operations } }),
    prisma.user.upsert({ where: { email: "founder@swadeshitraveller.com" }, update: {}, create: { name: "Founder Director", email: "founder@swadeshitraveller.com", password, role: Role.founder } }),
  ]);
  console.log(`✅ ${users.length} users`);

  // Trip Master is the single source of truth for trip names + per-pax base price.
  // Names here match the trip options shown in New Booking → Trip Details, so the
  // booking form can look up the right base price and auto-calculate
  // basePackageCost = basePrice x paxCount.
  const tripMasters = [
    // Weekend
    { id: "tm-w1", name: "Gokarna Dandeli", destination: "Gokarna & Dandeli", category: "Weekend", defaultDays: 3, basePrice: 6500 },
    { id: "tm-w2", name: "Gokarna Jogfalls", destination: "Gokarna & Jog Falls", category: "Weekend", defaultDays: 3, basePrice: 6000 },
    { id: "tm-w3", name: "Coorg Chikmaglur", destination: "Coorg & Chikmaglur", category: "Weekend", defaultDays: 3, basePrice: 7500 },
    { id: "tm-w4", name: "Ooty Coonoor", destination: "Ooty & Coonoor", category: "Weekend", defaultDays: 3, basePrice: 7000 },
    { id: "tm-w5", name: "Wayanad", destination: "Wayanad", category: "Weekend", defaultDays: 3, basePrice: 7000 },
    { id: "tm-w6", name: "Pondicherry", destination: "Pondicherry", category: "Weekend", defaultDays: 3, basePrice: 7500 },
    { id: "tm-w7", name: "Araku Vizag", destination: "Araku Valley & Vizag", category: "Weekend", defaultDays: 3, basePrice: 6500 },
    { id: "tm-w8", name: "Lonavala", destination: "Lonavala", category: "Weekend", defaultDays: 2, basePrice: 5500 },
    // Backpacking
    { id: "tm-b1", name: "Kerala", destination: "Kerala", category: "Backpacking", defaultDays: 6, basePrice: 15000 },
    { id: "tm-b2", name: "Ooty Kodaikanal", destination: "Ooty & Kodaikanal", category: "Backpacking", defaultDays: 5, basePrice: 11000 },
    { id: "tm-b3", name: "Goa", destination: "Goa", category: "Backpacking", defaultDays: 4, basePrice: 8000 },
    { id: "tm-b4", name: "Manali", destination: "Manali", category: "Backpacking", defaultDays: 5, basePrice: 12000 },
    { id: "tm-b5", name: "Gangtok Darjeeling", destination: "Gangtok & Darjeeling", category: "Backpacking", defaultDays: 6, basePrice: 16000 },
    { id: "tm-b6", name: "Rajasthan", destination: "Rajasthan", category: "Backpacking", defaultDays: 7, basePrice: 18000 },
    { id: "tm-b7", name: "Kashmir", destination: "Kashmir", category: "Backpacking", defaultDays: 6, basePrice: 20000 },
    { id: "tm-b8", name: "Andaman", destination: "Andaman", category: "Backpacking", defaultDays: 5, basePrice: 22000 },
    // Temple
    { id: "tm-t1", name: "Kedarnath", destination: "Kedarnath", category: "Temple", defaultDays: 6, basePrice: 14000 },
    { id: "tm-t2", name: "Do Dham", destination: "Do Dham", category: "Temple", defaultDays: 8, basePrice: 17000 },
    { id: "tm-t3", name: "Chardham", destination: "Chardham", category: "Temple", defaultDays: 10, basePrice: 22000 },
    { id: "tm-t4", name: "Temples of Tamilnadu", destination: "Tamil Nadu", category: "Temple", defaultDays: 5, basePrice: 9000 },
    { id: "tm-t5", name: "Temples of Karnataka", destination: "Karnataka", category: "Temple", defaultDays: 4, basePrice: 7500 },
    { id: "tm-t6", name: "Shirdi", destination: "Shirdi", category: "Temple", defaultDays: 2, basePrice: 5000 },
    { id: "tm-t7", name: "Puri and Bhubaneshwar", destination: "Puri & Bhubaneshwar", category: "Temple", defaultDays: 4, basePrice: 8500 },
  ];
  for (const tm of tripMasters) {
    await prisma.tripMaster.upsert({ where: { id: tm.id }, update: {}, create: tm });
  }
  console.log(`✅ ${tripMasters.length} trip masters`);

  await Promise.all([
    prisma.vendor.upsert({ where: { id: "v1" }, update: {}, create: { id: "v1", vendorCode: "VND-H001", name: "Hotel Sai Palace", type: VendorType.Hotel, contactName: "Ramesh", phone: "9876543210", city: "Shirdi", priceRate: 2500, rateUnit: "per room/night" } }),
    prisma.vendor.upsert({ where: { id: "v2" }, update: {}, create: { id: "v2", vendorCode: "VND-T001", name: "Sharma Travels", type: VendorType.Transport, contactName: "Vijay", phone: "9876543211", city: "Pune", priceRate: 4500, rateUnit: "per day" } }),
    prisma.vendor.upsert({ where: { id: "v3" }, update: {}, create: { id: "v3", vendorCode: "VND-G001", name: "Thomas Guide Services", type: VendorType.Guide, contactName: "Thomas", phone: "9876543212", city: "Manali", priceRate: 2000, rateUnit: "per day" } }),
  ]);
  console.log("✅ 3 vendors");

  const cust1 = await prisma.customer.upsert({
    where: { customerId: "CUS-2026-00001" }, update: {},
    create: { customerId: "CUS-2026-00001", name: "Rajesh Kumar", phone: "9876543001", city: "Pune", totalBookings: 1 },
  });
  const cust2 = await prisma.customer.upsert({
    where: { customerId: "CUS-2026-00002" }, update: {},
    create: { customerId: "CUS-2026-00002", name: "Anita Desai", phone: "9876543002", city: "Mumbai", totalBookings: 1 },
  });

  const trip1 = await prisma.trip.upsert({
    where: { id: "trip1" }, update: {},
    create: { id: "trip1", tripCode: "TRP-2026-00001", name: "Shirdi Darshan", category: "Temple", natureOfTrip: "GroupDeparture", destination: "Shirdi", departureDate: new Date("2026-09-15"), returnDate: new Date("2026-09-17"), basePrice: 5000, status: "Active" },
  });
  const trip2 = await prisma.trip.upsert({
    where: { id: "trip2" }, update: {},
    create: { id: "trip2", tripCode: "TRP-2026-00002", name: "Kerala Backwaters", category: "Backpacking", natureOfTrip: "GroupDeparture", destination: "Kerala", departureDate: new Date("2026-09-20"), returnDate: new Date("2026-09-26"), basePrice: 15000, status: "Active" },
  });
  console.log("✅ 2 trips");

  const b1 = await prisma.booking.upsert({
    where: { bookingCode: "BOOK-2026-00001" }, update: {},
    create: {
      bookingCode: "BOOK-2026-00001", customerId: cust1.id, userId: users[1].id,
      customerName: "Rajesh Kumar", phoneNumber: "9876543001", city: "Pune",
      tripType: "Temple", tripName: "Shirdi Darshan", tripId: trip1.id, natureOfTrip: "GroupDeparture",
      journeyDate: new Date("2026-09-15"), returnDate: new Date("2026-09-17"), paxCount: 2,
      onwardFrom: "Hyderabad", returnTo: "Hyderabad",
      basePackageCost: 10000, discountAmount: 500, discountReason: "Returning customer",
      discountApprovalStatus: "Approved", discountApprovedBy: "Admin",
      finalPackageCost: 9500, advancePaid: 5000, totalPaid: 5000, balanceDue: 4500,
      paymentStatus: "PARTIAL", leadOrigin: "WhatsApp", salesPersonName: "Priya Sharma",
    },
  });

  const b2 = await prisma.booking.upsert({
    where: { bookingCode: "BOOK-2026-00002" }, update: {},
    create: {
      bookingCode: "BOOK-2026-00002", customerId: cust2.id, userId: users[1].id,
      customerName: "Anita Desai", phoneNumber: "9876543002", city: "Mumbai",
      tripType: "Backpacking", tripName: "Kerala Backwaters", tripId: trip2.id, natureOfTrip: "GroupDeparture",
      journeyDate: new Date("2026-09-20"), returnDate: new Date("2026-09-26"), paxCount: 1,
      onwardFrom: "Vijayawada", returnTo: "Vijayawada",
      basePackageCost: 15000, finalPackageCost: 15000,
      ticketAdvanceAmount: 5000, actualTicketCost: 3800, ticketAdvanceBalance: 1200,
      advancePaid: 8000, totalPaid: 8000, balanceDue: 7000,
      paymentStatus: "PARTIAL", leadOrigin: "Instagram", salesPersonName: "Priya Sharma",
    },
  });
  console.log("✅ 2 bookings");

  await prisma.bookingPassenger.createMany({ skipDuplicates: true, data: [
    { bookingId: b1.id, name: "Rajesh Kumar", age: 35, gender: "M", phone: "9876543001" },
    { bookingId: b1.id, name: "Sunita Kumar", age: 32, gender: "F" },
    { bookingId: b2.id, name: "Anita Desai", age: 28, gender: "F", phone: "9876543002" },
  ]});

  await prisma.payment.upsert({
    where: { paymentCode: "PAY-2026-00001" }, update: {},
    create: { paymentCode: "PAY-2026-00001", bookingId: b1.id, amount: 5000, paymentMethod: "UPI", utrNumber: "UTR20260001", enteredBy: "Priya Sharma", enteredByRole: "sales", approvalStatus: "Approved", approvedBy: "Admin User", approvedAt: new Date() },
  });
  await prisma.payment.upsert({
    where: { paymentCode: "PAY-2026-00002" }, update: {},
    create: { paymentCode: "PAY-2026-00002", bookingId: b2.id, amount: 8000, paymentMethod: "NEFT", utrNumber: "UTR20260002", enteredBy: "Priya Sharma", enteredByRole: "sales", approvalStatus: "Pending" },
  });

  await prisma.ticketInventory.upsert({
    where: { inventoryCode: "TKT-INV-001" }, update: {},
    create: { inventoryCode: "TKT-INV-001", travelMode: "Train", operator: "Indian Railways", trainFlightNo: "12903", fromLocation: "Hyderabad", toLocation: "Mumbai", travelDate: new Date("2026-09-15"), departureTime: "06:30", coachClass: "Sleeper", totalSeats: 10, availableSeats: 8, allocatedSeats: 2, costPrice: 1200, sellingPrice: 1500, pnrNumber: "PNR123456", bookedBy: "Rahul Verma" },
  });

  await prisma.calendarEvent.createMany({ skipDuplicates: true, data: [
    { id: "cal1", bookingId: b1.id, tripId: trip1.id, tripName: "Shirdi Darshan", eventType: "DEPARTURE", title: "Shirdi Darshan — Rajesh Kumar", date: new Date("2026-09-15"), customerName: "Rajesh Kumar", destination: "Shirdi", department: "Operations" },
    { id: "cal2", bookingId: b1.id, eventType: "BALANCE_DUE", title: "Balance Due ₹4,500 — Rajesh Kumar", date: new Date("2026-09-08"), customerName: "Rajesh Kumar", department: "Finance" },
    { id: "cal3", bookingId: b2.id, tripId: trip2.id, tripName: "Kerala Backwaters", eventType: "DEPARTURE", title: "Kerala Backwaters — Anita Desai", date: new Date("2026-09-20"), customerName: "Anita Desai", destination: "Kerala", department: "Operations" },
    { id: "cal4", bookingId: b2.id, eventType: "PAYMENT_DUE", title: "Payment Pending Approval — PAY-2026-00002", date: new Date("2026-08-29"), customerName: "Anita Desai", department: "Finance" },
  ]});

  await prisma.bankAccount.upsert({ where: { id: "bank1" }, update: {}, create: { id: "bank1", accountName: "Swadeshi - HDFC Main", bankName: "HDFC Bank", accountNo: "50100123456789", ifscCode: "HDFC0001234", upiId: "swadeshi@hdfc" } });

  await prisma.lead.upsert({ where: { id: "lead1" }, update: {}, create: { id: "lead1", customerName: "Vikram Shah", phone: "9876543099", source: "Instagram", tripInterest: "Manali", budget: 15000, groupSize: 4, stage: "Interested", priority: "High", createdBy: "Priya Sharma" } });

  console.log("\n🎉 Seed complete! Password for all: demo@123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
