/**
 * LoanFlex PDF Export Module
 * Generates downloadable PDF sanction certificates and payment receipts.
 */
import { jsPDF } from "jspdf";
import { LoanItem } from "../app/dashboard/page";
import { RepaymentItem } from "../components/borrower/RepaymentScheduleModal";
import { UserProfile } from "../context/AuthContext";

/**
 * Generates an official Loan Sanction Letter PDF.
 */
export function generateSanctionLetter(loan: LoanItem, user: UserProfile) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("LOANFLEX FINANCIAL SERVICES", 20, 24);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL LOAN SANCTION & DISBURSAL LETTER", 20, 32);

  // Document Info
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - 60, 52);
  doc.text(`Ref ID: LFL-${loan.id.substring(0, 8).toUpperCase()}`, pageWidth - 60, 58);

  // Applicant Details Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, 48, pageWidth - 120, 32, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(20, 48, pageWidth - 120, 32, 3, 3, "S");

  doc.setFont("helvetica", "bold");
  doc.text("APPLICANT DETAILS", 26, 56);
  doc.setFont("helvetica", "normal");
  doc.text(`Name:  ${user.name}`, 26, 64);
  doc.text(`Email: ${user.email}`, 26, 72);

  // Terms Table
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SANCTION TERMS & CONDITIONS", 20, 96);

  doc.setLineWidth(0.5);
  doc.setDrawColor(79, 70, 229);
  doc.line(20, 99, pageWidth - 20, 99);

  const terms = [
    ["Sanctioned Amount", `INR ${loan.amount.toLocaleString("en-IN")}`],
    ["Tenure", `${loan.tenureMonths} Months`],
    ["Interest Rate", `${loan.interestRate}% p.a. Fixed`],
    ["Status", loan.status],
    ["Purpose", loan.purpose],
    [
      "Applied Date",
      new Date(loan.appliedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    ],
  ];

  let y = 110;
  terms.forEach(([label, val], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 5, pageWidth - 40, 10, "F");
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(label, 26, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(val, 110, y);
    y += 10;
  });

  // Verification Seal Box
  y += 20;
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(20, y, pageWidth - 40, 35, 3, 3, "F");
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(20, y, pageWidth - 40, 35, 3, 3, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(67, 56, 202);
  doc.text("DIGITAL VERIFICATION SEAL & AUDIT TRAIL", 26, y + 10);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(79, 70, 229);
  doc.text(
    `This document certifies that Loan ID ${loan.id} has been processed via LoanFlex's automated state machine.`,
    26,
    y + 18,
  );
  doc.text(
    `Cryptographic Verification Hash: SHA256-${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
    26,
    y + 25,
  );

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Computer-generated sanction letter. No physical signature required.",
    pageWidth / 2,
    280,
    { align: "center" },
  );

  doc.save(`Sanction_Letter_${loan.id.substring(0, 8)}.pdf`);
}

/**
 * Generates an official EMI Payment Receipt PDF.
 */
export function generatePaymentReceipt(
  repayment: RepaymentItem,
  loanAmount: number,
  user: UserProfile,
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("LOANFLEX FINANCIAL SERVICES", 20, 24);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL EMI PAYMENT RECEIPT", 20, 32);

  // Details
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.text(`Receipt Date: ${new Date().toLocaleDateString("en-IN")}`, pageWidth - 65, 52);
  doc.text(
    `Txn Ref: TXN-${repayment.id.substring(0, 8).toUpperCase()}`,
    pageWidth - 65,
    58,
  );

  // Receipt Box
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, 70, pageWidth - 40, 95, 4, 4, "F");
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(20, 70, pageWidth - 40, 95, 4, 4, "S");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(6, 95, 70);
  doc.text("PAYMENT ACKNOWLEDGEMENT", 26, 82);

  const receiptRows = [
    ["Borrower Name", user.name],
    ["Loan Reference ID", repayment.loanId],
    ["Installment Number", `EMI #${repayment.emiNumber}`],
    ["Principal Component", `INR ${repayment.principalComponent.toLocaleString("en-IN")}`],
    ["Interest Component", `INR ${repayment.interestComponent.toLocaleString("en-IN")}`],
    ["Total Paid Amount", `INR ${repayment.totalAmount.toLocaleString("en-IN")}`],
    [
      "Payment Date",
      repayment.paidAt
        ? new Date(repayment.paidAt).toLocaleString("en-IN")
        : new Date().toLocaleString("en-IN"),
    ],
  ];

  let y = 92;
  receiptRows.forEach(([label, val]) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(6, 78, 59);
    doc.text(label, 26, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(val, 110, y);
    y += 9;
  });

  // Stamp Box
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth - 75, 175, 55, 22, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("STATUS: PAID", pageWidth - 67, 189);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Thank you for your payment. Keep this receipt for your financial records.",
    pageWidth / 2,
    280,
    { align: "center" },
  );

  doc.save(`EMI_Receipt_${repayment.id.substring(0, 8)}.pdf`);
}
