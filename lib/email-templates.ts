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

// ============================================
// AUTHOR SUPPORT EMAIL TEMPLATES
// ============================================

export interface SupportTransactionEmailData {
  supporterName: string;
  supporterEmail?: string;
  authorName: string;
  authorEmail: string;
  amount: number;
  netAmount: number;
  platformFee: number;
  message?: string;
  blogPostTitle?: string;
  blogPostUrl?: string;
  transactionId: string;
  transactionDate: string;
}

/**
 * Email to the supporter thanking them for their support
 */
export function generateSupporterThankYouEmail(data: SupportTransactionEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarket.co.ke';
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">💚 Thank You!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your support means the world</p>
      </div>
      
      <!-- Content -->
      <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi ${data.supporterName},
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Thank you for supporting <strong style="color: #059669;">${data.authorName}</strong>! Your generosity helps creators continue producing great content.
        </p>
        
        <!-- Transaction Details -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">📝 Support Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Amount:</td>
              <td style="color: #166534; padding: 8px 0; font-size: 14px; font-weight: 600; text-align: right;">KES ${data.amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Date:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right;">${data.transactionDate}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Transaction ID:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right; font-family: monospace;">${data.transactionId}</td>
            </tr>
            ${data.blogPostTitle ? `
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">For Post:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right;">${data.blogPostTitle}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        ${data.message ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px; font-style: italic;">
            "${data.message}"
          </p>
          <p style="color: #a16207; margin: 10px 0 0 0; font-size: 12px;">— Your message to the author</p>
        </div>
        ` : ''}
        
        ${data.blogPostUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.blogPostUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; 
                    padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Read the Article →
          </a>
        </div>
        ` : ''}
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          If you have any questions about this transaction, please contact our support team.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; padding: 25px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} PoultryMarket. All rights reserved.</p>
        <p style="margin: 5px 0;">
          <a href="${baseUrl}" style="color: #059669; text-decoration: none;">Visit PoultryMarket</a>
        </p>
      </div>
    </div>
  `;
}

/**
 * Email to the author notifying them of a new support
 */
export function generateAuthorSupportReceivedEmail(data: SupportTransactionEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarket.co.ke';
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 You Got Support!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Someone appreciates your work</p>
      </div>
      
      <!-- Content -->
      <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi ${data.authorName},
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Great news! <strong style="color: #db2777;">${data.supporterName}</strong> just supported your work! 🎊
        </p>
        
        <!-- Support Amount Card -->
        <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border: 2px solid #f9a8d4; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
          <p style="color: #9d174d; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">You Received</p>
          <p style="color: #be185d; margin: 10px 0; font-size: 36px; font-weight: 700;">KES ${data.netAmount.toLocaleString()}</p>
          <p style="color: #9d174d; margin: 0; font-size: 12px;">(KES ${data.amount.toLocaleString()} - KES ${data.platformFee.toLocaleString()} platform fee)</p>
        </div>
        
        <!-- Transaction Details -->
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">📝 Transaction Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">From:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 500;">${data.supporterName}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Date:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right;">${data.transactionDate}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Transaction ID:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right; font-family: monospace;">${data.transactionId}</td>
            </tr>
            ${data.blogPostTitle ? `
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">For Post:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right;">${data.blogPostTitle}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background-color: ${data.message ? '#fef3c7' : '#f3f4f6'}; border-left: 4px solid ${data.message ? '#f59e0b' : '#9ca3af'}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="color: ${data.message ? '#92400e' : '#6b7280'}; margin: 0 0 5px 0; font-size: 12px; font-weight: 600;">MESSAGE FROM SUPPORTER:</p>
          <p style="color: ${data.message ? '#92400e' : '#9ca3af'}; margin: 0; font-size: 15px; font-style: italic;">
            ${data.message ? `"${data.message}"` : 'No message included'}
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/author/support/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #db2777, #ec4899); color: white; 
                    padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View Dashboard →
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px; text-align: center;">
          Keep creating amazing content! Your readers appreciate you. 💕
        </p>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; padding: 25px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} PoultryMarket. All rights reserved.</p>
        <p style="margin: 5px 0;">
          <a href="${baseUrl}/author/support/dashboard" style="color: #db2777; text-decoration: none;">Manage your support wallet</a>
        </p>
      </div>
    </div>
  `;
}

/**
 * Email to admin about a new support transaction
 */
export function generateAdminSupportNotificationEmail(data: SupportTransactionEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarket.co.ke';
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">💰 New Support Transaction</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Admin Notification</p>
      </div>
      
      <!-- Content -->
      <div style="background-color: white; padding: 25px; border-radius: 0 0 8px 8px;">
        <!-- Platform Fee Card -->
        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <p style="color: #1e40af; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Platform Revenue</p>
          <p style="color: #1d4ed8; margin: 8px 0; font-size: 28px; font-weight: 700;">KES ${data.platformFee.toLocaleString()}</p>
          <p style="color: #3b82f6; margin: 0; font-size: 12px;">(5% of KES ${data.amount.toLocaleString()})</p>
        </div>
        
        <!-- Transaction Details -->
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Transaction ID</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-family: monospace;">${data.transactionId}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Supporter</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.supporterName}${data.supporterEmail ? ` (${data.supporterEmail})` : ''}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Author</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.authorName} (${data.authorEmail})</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Total Amount</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">KES ${data.amount.toLocaleString()}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Author Receives</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #059669; font-weight: 600;">KES ${data.netAmount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Platform Fee</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #2563eb; font-weight: 600;">KES ${data.platformFee.toLocaleString()}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Date</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.transactionDate}</td>
          </tr>
          ${data.blogPostTitle ? `
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Blog Post</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.blogPostTitle}</td>
          </tr>
          ` : ''}
        </table>
        
        ${data.message ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <p style="color: #92400e; margin: 0; font-size: 13px;"><strong>Message:</strong> "${data.message}"</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 25px;">
          <a href="${baseUrl}/admin/analytics" 
             style="display: inline-block; background: #2563eb; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
            View Admin Dashboard
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 11px;">
        <p style="margin: 0;">This is an automated admin notification from PoultryMarket</p>
      </div>
    </div>
  `;
}

// ============================================
// WALLET CREATION EMAIL TEMPLATES
// ============================================

export interface WalletCreationEmailData {
  authorName: string;
  authorEmail: string;
  authorUsername: string;
  walletId: string;
  mpesaNumber?: string;
  createdAt: string;
}

/**
 * Email to author when their wallet is created
 */
export function generateWalletCreatedAuthorEmail(data: WalletCreationEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarket.co.ke';
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Wallet Created!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Start receiving reader support</p>
      </div>
      
      <!-- Content -->
      <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hi ${data.authorName},
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your reader support wallet has been successfully created. You can now receive support from your readers!
        </p>
        
        <!-- Wallet Details -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">💼 Wallet Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Wallet ID:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right; font-family: monospace;">${data.walletId}</td>
            </tr>
            ${data.mpesaNumber ? `
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">M-Pesa Number:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right;">${data.mpesaNumber}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Created:</td>
              <td style="color: #374151; padding: 8px 0; font-size: 14px; text-align: right;">${data.createdAt}</td>
            </tr>
          </table>
        </div>
        
        <!-- Share Link Card -->
        <div style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
          <p style="color: #9d174d; margin: 0 0 10px 0; font-size: 14px; font-weight: 600;">Share your support page:</p>
          <p style="color: #be185d; margin: 0; font-size: 14px; font-family: monospace; word-break: break-all;">
            ${baseUrl}/support/${data.authorUsername}
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/author/support/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; 
                    padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-right: 10px;">
            View Dashboard
          </a>
        </div>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 25px;">
          <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 14px;">📌 Quick Tips:</h4>
          <ul style="color: #6b7280; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Share your support link on social media and in your blog posts</li>
            <li>Minimum withdrawal is KES 200 via M-Pesa</li>
            <li>Platform takes only 5% fee on successful support</li>
            <li>Withdrawals are processed instantly to your M-Pesa</li>
          </ul>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; padding: 25px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 5px 0;">© ${new Date().getFullYear()} PoultryMarket. All rights reserved.</p>
      </div>
    </div>
  `;
}

/**
 * Email to admin when a new wallet is created
 */
export function generateWalletCreatedAdminEmail(data: WalletCreationEmailData): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarket.co.ke';
  
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">💼 New Author Wallet Created</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 13px;">Admin Notification</p>
      </div>
      
      <!-- Content -->
      <div style="background-color: white; padding: 25px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; font-size: 14px; margin-bottom: 20px;">
          A new author support wallet has been created on the platform.
        </p>
        
        <!-- Details Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Author</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 500;">${data.authorName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Email</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.authorEmail}</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Username</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">@${data.authorUsername}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Wallet ID</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-family: monospace;">${data.walletId}</td>
          </tr>
          ${data.mpesaNumber ? `
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">M-Pesa Number</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.mpesaNumber}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; color: #6b7280;">Created</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${data.createdAt}</td>
          </tr>
        </table>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="${baseUrl}/admin/analytics" 
             style="display: inline-block; background: #2563eb; color: white; 
                    padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 13px;">
            View Admin Dashboard
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; padding: 15px; color: #9ca3af; font-size: 11px;">
        <p style="margin: 0;">Automated admin notification from PoultryMarket</p>
      </div>
    </div>
  `;
}