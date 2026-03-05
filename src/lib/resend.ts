import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEscalationEmail(
  to: string,
  elderName: string,
  severity: string,
  description: string
) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `[CheckMate Alert] ${severity.toUpperCase()}: ${elderName} needs attention`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d9488; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">CheckMate Alert</h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <div style="background: ${severity === "critical" ? "#fef2f2" : severity === "high" ? "#fff7ed" : "#fefce8"}; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: ${severity === "critical" ? "#b91c1c" : severity === "high" ? "#c2410c" : "#a16207"};">
              ${severity.toUpperCase()} Severity
            </p>
          </div>
          <p style="color: #374151; margin-bottom: 8px;"><strong>${elderName}</strong> may need your attention.</p>
          <p style="color: #6b7280;">${description}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            This is an automated alert from CheckMate. Please check on your loved one.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendDailySummaryEmail(
  to: string,
  familyName: string,
  summaries: Array<{ elderName: string; status: string; moodScore: number | null; summary: string }>
) {
  const elderRows = summaries
    .map(
      (s) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${s.elderName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${s.status}</td>
        <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${s.moodScore ?? "N/A"}/10</td>
        <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${s.summary}</td>
      </tr>
    `
    )
    .join("");

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `[CheckMate] Daily Summary for ${familyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d9488; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Daily Check-In Summary</h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151;">Here&apos;s how everyone is doing today:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">Elder</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">Status</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">Mood</th>
                <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280;">Summary</th>
              </tr>
            </thead>
            <tbody>
              ${elderRows}
            </tbody>
          </table>
        </div>
      </div>
    `,
  });
}
