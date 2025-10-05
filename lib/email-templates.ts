export interface ProductUpdateEmailData {
  productName: string;
  productId: string;
  updatedBy: string;
  updatedByEmail: string;
  updatedAt: string;
  changes: string[];
  currentDetails: {
    type: string;
    price: number;
    stock: number;
    isActive: boolean;
  };
}

export function generateProductUpdateEmail(data: ProductUpdateEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #059669; margin-bottom: 10px;">🐔 PoultryMarket</h1>
        <h2 style="color: #2563eb; margin: 0;">Product Updated Successfully</h2>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">📦 ${data.productName}</h3>
        <div style="color: #475569; font-size: 14px;">
          <p style="margin: 5px 0;"><strong>Product ID:</strong> ${data.productId}</p>
          <p style="margin: 5px 0;"><strong>Updated by:</strong> ${data.updatedBy} (${data.updatedByEmail})</p>
          <p style="margin: 5px 0;"><strong>Updated on:</strong> ${data.updatedAt}</p>
        </div>
      </div>

      ${data.changes.length > 0 ? `
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <h4 style="margin-top: 0; color: #0c4a6e; font-size: 16px;">📝 Changes Made:</h4>
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            ${data.changes.map(change => `
              <li style="padding: 8px 12px; margin: 5px 0; background-color: #ffffff; border-radius: 4px; border: 1px solid #e2e8f0;">
                <span style="color: #059669; font-weight: bold;">✓</span> ${change}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="background-color: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #eab308;">
        <h4 style="margin-top: 0; color: #a16207; font-size: 16px;">📊 Current Product Details:</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; color: #713f12;">
          <p style="margin: 5px 0;"><strong>Type:</strong> ${data.currentDetails.type}</p>
          <p style="margin: 5px 0;"><strong>Price:</strong> Ksh ${data.currentDetails.price.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Stock:</strong> ${data.currentDetails.stock} units</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> 
            <span style="color: ${data.currentDetails.isActive ? '#059669' : '#dc2626'}; font-weight: bold;">
              ${data.currentDetails.isActive ? '✅ Active' : '❌ Inactive'}
            </span>
          </p>
        </div>
      </div>

      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 30px 0; text-align: center;">
        <p style="margin: 10px 0; color: #334155; font-size: 14px;">
          Want to view your product? 
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/seller/products" 
             style="color: #2563eb; text-decoration: none; font-weight: bold;">
            Visit Your Dashboard →
          </a>
        </p>
      </div>

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #6b7280;">
        <p style="margin: 5px 0; font-size: 13px;">This is an automated notification from your PoultryMarket dashboard.</p>
        <p style="margin: 5px 0; font-size: 13px;">If you have any questions, please contact our support team.</p>
        <div style="margin-top: 15px;">
          <p style="margin: 5px 0; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} PoultryMarket. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

export function generateSimpleProductUpdateEmail(productName: string, userName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; text-align: center;">
      <h2 style="color: #059669;">🐔 Product Updated!</h2>
      <p style="color: #475569; font-size: 16px;">
        Hi ${userName}, your product <strong>${productName}</strong> has been successfully updated.
      </p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/seller/products" 
         style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold;">
        View Your Products
      </a>
    </div>
  `;
}