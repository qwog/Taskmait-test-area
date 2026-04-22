import {
  BillingType,
  CompanyStatus,
  DealStage,
  IssueStatus,
  PaymentStatus,
  PrismaClient,
  RenewalStatus,
  Role,
  SlotLocation
} from "@prisma/client";
import { addMonths, startOfMonth } from "date-fns";

const db = new PrismaClient();

async function main() {
  await db.$transaction([
    db.adSale.deleteMany(),
    db.inventorySlot.deleteMany(),
    db.product.deleteMany(),
    db.deal.deleteMany(),
    db.contact.deleteMany(),
    db.lead.deleteMany(),
    db.company.deleteMany(),
    db.task.deleteMany(),
    db.pipelineStage.deleteMany(),
    db.issue.deleteMany(),
    db.user.deleteMany()
  ]);

  const [admin, sales] = await Promise.all([
    db.user.create({
      data: { firstName: "Alex", lastName: "Owner", email: "admin@localendarcrm.com", passwordHash: "changeme", role: Role.ADMIN }
    }),
    db.user.create({
      data: { firstName: "Sam", lastName: "Rep", email: "sales@localendarcrm.com", passwordHash: "changeme", role: Role.SALES }
    })
  ]);

  const stageData = [
    ["New Lead", 10],
    ["Contacted", 20],
    ["Qualified", 40],
    ["Proposal Sent", 60],
    ["Negotiation", 75],
    ["Verbal Yes", 90],
    ["Won", 100],
    ["Lost", 0]
  ];

  await Promise.all(
    stageData.map(([name, probabilityDefault], sortOrder) =>
      db.pipelineStage.create({
        data: {
          name,
          sortOrder,
          probabilityDefault,
          isClosedWon: name === "Won",
          isClosedLost: name === "Lost"
        }
      })
    )
  );

  const now = startOfMonth(new Date());
  const issues = await Promise.all(
    [0, 1, 2].map((offset) => {
      const d = addMonths(now, offset);
      return db.issue.create({
        data: {
          issueName: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          status: offset === 0 ? IssueStatus.SELLING : IssueStatus.PLANNING
        }
      });
    })
  );

  const products = await Promise.all([
    db.product.create({ data: { name: "Front Premium Ad", code: "FRONT-PREM", defaultPrice: 1200, billingType: BillingType.ONE_TIME, displayOrder: 1 } }),
    db.product.create({ data: { name: "Front Standard Ad", code: "FRONT-STD", defaultPrice: 850, billingType: BillingType.ONE_TIME, displayOrder: 2 } }),
    db.product.create({ data: { name: "Back Small Ad", code: "BACK-SM", defaultPrice: 400, billingType: BillingType.ONE_TIME, displayOrder: 3 } }),
    db.product.create({ data: { name: "Monthly Sponsor", code: "MONTH-SPONSOR", defaultPrice: 1500, billingType: BillingType.MONTHLY, displayOrder: 4 } })
  ]);

  const slots = await Promise.all([
    db.inventorySlot.create({ data: { name: "Front Row 1 Left", code: "F-R1-L", productId: products[0].id, location: SlotLocation.FRONT, sizeLabel: "Large", sortOrder: 1 } }),
    db.inventorySlot.create({ data: { name: "Front Row 1 Center", code: "F-R1-C", productId: products[1].id, location: SlotLocation.FRONT, sizeLabel: "Medium", sortOrder: 2 } }),
    db.inventorySlot.create({ data: { name: "Back Small Slot 1", code: "B-S1", productId: products[2].id, location: SlotLocation.BACK, sizeLabel: "Small", sortOrder: 3 } }),
    db.inventorySlot.create({ data: { name: "Sponsor Banner", code: "SPONSOR", productId: products[3].id, location: SlotLocation.SPECIAL, sizeLabel: "Banner", sortOrder: 4 } })
  ]);

  const companyNames = [
    "Summit Roofing",
    "Blue Valve Plumbing",
    "BrightSpark Electric",
    "Hometown Realty Group",
    "Northwind HVAC",
    "SmileCraft Dental",
    "GreenTrail Landscaping",
    "SafeHome Pest Control",
    "RiverGlow Med Spa",
    "Maple & Hart Law"
  ];

  const companies = await Promise.all(
    companyNames.map((companyName, i) =>
      db.company.create({
        data: {
          companyName,
          status: i < 4 ? CompanyStatus.ACTIVE_CUSTOMER : CompanyStatus.PROSPECT,
          ownerUserId: i % 2 === 0 ? admin.id : sales.id,
          industry: ["Roofing", "Plumbing", "Electrical", "Real Estate", "HVAC", "Dental", "Landscaping", "Pest Control", "Beauty / Med Spa", "Legal"][i]
        }
      })
    )
  );

  const contacts = await Promise.all(
    companies.flatMap((company, i) => [
      db.contact.create({ data: { companyId: company.id, firstName: `Primary${i + 1}`, lastName: "Contact", email: `primary${i + 1}@example.com`, isPrimaryContact: true } }),
      db.contact.create({ data: { companyId: company.id, firstName: `Backup${i + 1}`, lastName: "Contact", email: `backup${i + 1}@example.com` } })
    ])
  );

  await Promise.all(
    Array.from({ length: 15 }).map((_, i) =>
      db.lead.create({
        data: {
          companyNameRaw: `Prospect ${i + 1} Services`,
          contactNameRaw: `Lead ${i + 1}`,
          email: `lead${i + 1}@example.com`,
          status: i < 3 ? "CONTACTED" : i < 8 ? "NEW" : "QUALIFIED",
          assignedUserId: i % 2 === 0 ? sales.id : admin.id,
          industry: ["Roofing", "Plumbing", "Electrical", "HVAC", "Legal"][i % 5],
          source: ["Cold Call", "Referral", "Website", "Networking"][i % 4]
        }
      })
    )
  );

  const deals = await Promise.all(
    companies.slice(0, 6).map((company, i) =>
      db.deal.create({
        data: {
          companyId: company.id,
          primaryContactId: contacts[i * 2]?.id,
          title: `${company.companyName} Monthly Placement`,
          pipelineStage: [DealStage.CONTACTED, DealStage.QUALIFIED, DealStage.PROPOSAL_SENT, DealStage.NEGOTIATION, DealStage.VERBAL_YES, DealStage.WON][i],
          estimatedValue: 500 + i * 250,
          probabilityPercent: [20, 40, 60, 75, 90, 100][i],
          assignedUserId: i % 2 === 0 ? admin.id : sales.id
        }
      })
    )
  );

  await Promise.all([
    db.adSale.create({
      data: {
        companyId: companies[0].id,
        contactId: contacts[0].id,
        dealId: deals[0].id,
        issueId: issues[0].id,
        inventorySlotId: slots[0].id,
        productId: products[0].id,
        saleName: "Summit Front Premium",
        quantity: 1,
        unitPrice: 1200,
        totalPrice: 1200,
        finalPrice: 1200,
        paymentStatus: PaymentStatus.PAID,
        renewalStatus: RenewalStatus.RENEWAL_DUE
      }
    }),
    db.adSale.create({
      data: {
        companyId: companies[1].id,
        contactId: contacts[2].id,
        dealId: deals[1].id,
        issueId: issues[0].id,
        inventorySlotId: slots[1].id,
        productId: products[1].id,
        saleName: "Blue Valve Front Standard",
        quantity: 1,
        unitPrice: 850,
        totalPrice: 850,
        discountAmount: 50,
        finalPrice: 800,
        paymentStatus: PaymentStatus.PARTIAL,
        renewalStatus: RenewalStatus.NONE
      }
    }),
    db.adSale.create({
      data: {
        companyId: companies[2].id,
        contactId: contacts[4].id,
        dealId: deals[2].id,
        issueId: issues[1].id,
        inventorySlotId: slots[2].id,
        productId: products[2].id,
        saleName: "BrightSpark Back Small",
        quantity: 1,
        unitPrice: 400,
        totalPrice: 400,
        finalPrice: 400,
        paymentStatus: PaymentStatus.UNPAID,
        renewalStatus: RenewalStatus.RENEWAL_CONTACTED
      }
    })
  ]);

  await db.task.createMany({
    data: [
      { title: "Follow up on unpaid balance", assignedUserId: sales.id, createdByUserId: admin.id },
      { title: "Send renewal proposal", assignedUserId: admin.id, createdByUserId: admin.id }
    ]
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
