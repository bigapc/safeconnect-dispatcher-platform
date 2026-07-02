interface AssignmentTemplateInput {
  title: string;
  priority: string;
  status?: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
}

interface CourierTemplateInput {
  courierName: string;
  status: string;
}

interface SystemAlertTemplateInput {
  title: string;
  message: string;
}

const buildLayout = (title: string, body: string): string => {
  return `
    <div style="font-family: Arial, sans-serif; background: #f5f7fb; padding: 24px; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f766e, #0891b2); color: #ffffff; padding: 18px 24px;">
          <p style="margin: 0; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; opacity: .9;">SafeConnect</p>
          <h2 style="margin: 6px 0 0 0; font-size: 20px;">${title}</h2>
        </div>
        <div style="padding: 20px 24px; line-height: 1.6; font-size: 14px;">
          ${body}
        </div>
        <div style="padding: 12px 24px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
          This message was sent by SafeConnect Dispatcher Platform.
        </div>
      </div>
    </div>
  `;
};

export const assignmentCreatedTemplate = (input: AssignmentTemplateInput): string => {
  return buildLayout(
    'Assignment Created',
    `
      <p>A new assignment has been created.</p>
      <p><strong>Title:</strong> ${input.title}</p>
      <p><strong>Priority:</strong> ${input.priority}</p>
      <p><strong>Pickup:</strong> ${input.pickupAddress ?? 'N/A'}</p>
      <p><strong>Dropoff:</strong> ${input.dropoffAddress ?? 'N/A'}</p>
    `,
  );
};

export const assignmentAssignedTemplate = (input: AssignmentTemplateInput): string => {
  return buildLayout(
    'Assignment Assigned',
    `
      <p>An assignment has been assigned to a courier.</p>
      <p><strong>Title:</strong> ${input.title}</p>
      <p><strong>Status:</strong> ${input.status ?? 'ASSIGNED'}</p>
      <p><strong>Priority:</strong> ${input.priority}</p>
    `,
  );
};

export const courierUpdateTemplate = (input: CourierTemplateInput): string => {
  return buildLayout(
    'Courier Status Update',
    `
      <p>Courier status changed.</p>
      <p><strong>Courier:</strong> ${input.courierName}</p>
      <p><strong>Status:</strong> ${input.status}</p>
    `,
  );
};

export const systemAlertTemplate = (input: SystemAlertTemplateInput): string => {
  return buildLayout(
    'System Alert',
    `
      <p><strong>${input.title}</strong></p>
      <p>${input.message}</p>
    `,
  );
};
