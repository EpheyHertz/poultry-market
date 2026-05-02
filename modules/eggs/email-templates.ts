function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Nairobi',
  }).format(date);
}

export function dailyEggReminderTemplate(name: string) {
  const today = formatDate(new Date());
  return {
    subject: 'Daily Egg Record Reminder',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <h2 style="color: #065f46; margin-bottom: 12px;">Daily Egg Record Reminder</h2>
        <p>Hello ${name || 'Farmer'},</p>
        <p>We have not detected an egg production entry for <strong>${today}</strong>.</p>
        <p>Record your eggs now to keep your farm analytics and weekly reports accurate.</p>
        <p style="margin-top: 24px;">Poultry Marketplace Farm Management</p>
      </div>
    `,
  };
}

export function weeklySummaryTemplate(params: {
  name: string;
  startDate: Date;
  endDate: Date;
  totalEggs: number;
  averagePerDay: number;
}) {
  return {
    subject: 'Your Weekly Egg Production Summary',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <h2 style="color: #1d4ed8; margin-bottom: 12px;">Weekly Egg Production Summary</h2>
        <p>Hello ${params.name || 'Farmer'},</p>
        <p>Here is your summary from <strong>${formatDate(params.startDate)}</strong> to <strong>${formatDate(params.endDate)}</strong>.</p>
        <ul>
          <li>Total eggs collected: <strong>${params.totalEggs}</strong></li>
          <li>Average per day: <strong>${params.averagePerDay.toFixed(2)}</strong></li>
        </ul>
        <p style="margin-top: 24px;">Keep up the good work.</p>
      </div>
    `,
  };
}

export function farmAlertsTemplate(params: {
  name: string;
  inactivityDays?: number;
  lastRecordDate?: Date | null;
  vaccinations?: Array<{ vaccineName: string; scheduledDate: Date; flockName?: string | null }>;
}) {
  const inactivitySection =
    params.inactivityDays !== undefined
      ? `
      <h3 style="color: #b45309;">No Recent Egg Records</h3>
      <p>No egg production has been logged for <strong>${params.inactivityDays}</strong> day(s).</p>
      ${params.lastRecordDate ? `<p>Last recorded entry: ${formatDate(params.lastRecordDate)}</p>` : '<p>No egg entries have been recorded yet.</p>'}
    `
      : '';

  const vaccinationSection =
    params.vaccinations && params.vaccinations.length > 0
      ? `
      <h3 style="color: #7c3aed;">Upcoming Vaccinations</h3>
      <ul>
        ${params.vaccinations
          .map(
            (item) =>
              `<li><strong>${item.vaccineName}</strong> on ${formatDate(item.scheduledDate)}${item.flockName ? ` for flock ${item.flockName}` : ''}</li>`
          )
          .join('')}
      </ul>
    `
      : '';

  return {
    subject: 'Farm Activity Alerts',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <h2 style="color: #dc2626; margin-bottom: 12px;">Farm Alerts</h2>
        <p>Hello ${params.name || 'Farmer'},</p>
        ${inactivitySection}
        ${vaccinationSection}
        <p style="margin-top: 24px;">Please review your records to keep your farm schedule up to date.</p>
      </div>
    `,
  };
}
