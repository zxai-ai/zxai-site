const RESEND_API = "https://api.resend.com/emails";

export async function sendReportLink(
  email: string,
  orderId: string,
  score: number,
  apiKey: string,
  baseUrl: string
): Promise<void> {
  const reportUrl = `${baseUrl}/report/${orderId}`;

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: "reports@zxai.ai",
      to: email,
      subject: `Your AI Visibility Score: ${score}/100`,
      html: `<p>Your AI Visibility Audit is ready. You scored <strong>${score} out of 100</strong>.</p>
<p><a href="${reportUrl}">View your full report here.</a></p>
<p>The report includes your scores across 5 dimensions and ranked recommendations you can act on today.</p>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}
