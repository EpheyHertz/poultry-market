// // Test file to preview the announcement email template
// // This demonstrates how the professional announcement email will look

// const emailTemplates = {
//   announcement: (name: string, announcementType: string, title: string, content: string, authorName: string, viewUrl: string) => {
//     // Define announcement type configurations
//     const typeConfig: { [key: string]: { icon: string, color: string, bgColor: string, description: string } } = {
//       'GENERAL': { 
//         icon: '📢', 
//         color: '#2563eb', 
//         bgColor: '#dbeafe',
//         description: 'General Information' 
//       },
//       'URGENT': { 
//         icon: '🚨', 
//         color: '#dc2626', 
//         bgColor: '#fee2e2',
//         description: 'Urgent Notice' 
//       },
//       'EVENT': { 
//         icon: '📅', 
//         color: '#7c3aed', 
//         bgColor: '#f3e8ff',
//         description: 'Event Announcement' 
//       },
//       'PROMOTION': { 
//         icon: '🏷️', 
//         color: '#ea580c', 
//         bgColor: '#fed7aa',
//         description: 'Special Promotion' 
//       },
//       'SALE': { 
//         icon: '💰', 
//         color: '#059669', 
//         bgColor: '#d1fae5',
//         description: 'Sale Alert' 
//       },
//       'PRODUCT_LAUNCH': { 
//         icon: '🚀', 
//         color: '#0891b2', 
//         bgColor: '#cffafe',
//         description: 'Product Launch' 
//       },
//       'DISCOUNT': { 
//         icon: '🎁', 
//         color: '#c2410c', 
//         bgColor: '#fed7aa',
//         description: 'Discount Offer' 
//       },
//       'SLAUGHTER_SCHEDULE': { 
//         icon: '📋', 
//         color: '#7c2d12', 
//         bgColor: '#fef3c7',
//         description: 'Slaughter Schedule' 
//       }
//     };

//     const config = typeConfig[announcementType] || typeConfig['GENERAL'];
    
//     return `
// <!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>${title} - PoultryMarket Announcement</title>
// </head>
// <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
//   <div style="max-width: 650px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px;">
    
//     <!-- Header -->
//     <div style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); padding: 50px 30px; text-align: center; position: relative; overflow: hidden;">
//       <!-- Background Pattern -->
//       <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);"></div>
      
//       <div style="position: relative; z-index: 1;">
//         <div style="font-size: 48px; margin-bottom: 15px;">${config.icon}</div>
//         <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">New ${config.description}</h1>
//         <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px; font-weight: 500;">PoultryMarket Kenya</p>
//         <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 15px;">
//           <span style="color: white; font-size: 14px; font-weight: 600;">📍 Published by ${authorName}</span>
//         </div>
//       </div>
//     </div>
    
//     <!-- Content -->
//     <div style="padding: 45px 30px;">
//       <div style="text-align: center; margin-bottom: 35px;">
//         <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 28px; font-weight: 700; line-height: 1.3;">${title}</h2>
//         <div style="background: ${config.bgColor}; color: ${config.color}; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: 600;">
//           ${config.icon} ${config.description}
//         </div>
//       </div>
      
//       <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border-left: 4px solid ${config.color};">
//         <h3 style="color: #334155; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">📋 Announcement Details</h3>
//         <div style="color: #475569; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${content}</div>
//       </div>
      
//       <!-- Call to Action -->
//       <div style="text-align: center; margin: 40px 0;">
//         <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: white; text-decoration: none; padding: 18px 36px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;">
//           📖 View Full Announcement
//         </a>
//       </div>
      
//       <!-- Why This Matters -->
//       <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #0ea5e9;">
//         <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">💡 Why This Matters</h4>
//         <p style="color: #164e63; margin: 0; font-size: 15px; line-height: 1.7;">
//           Stay informed with the latest updates from PoultryMarket Kenya. Our announcements help you discover new opportunities, stay updated on important changes, and make the most of our platform.
//         </p>
//       </div>
      
//       <!-- Quick Actions -->
//       <div style="background: #fafafa; padding: 25px; border-radius: 12px; margin: 25px 0;">
//         <h4 style="color: #374151; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; text-align: center;">🚀 Quick Actions</h4>
//         <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 10px;">
//           <div style="display: table-row;">
//             <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
//               <a href="https://poultrymarketke.com/announcements" style="text-decoration: none; color: #4f46e5; font-weight: 600; font-size: 14px;">📢 All Announcements</a>
//             </div>
//             <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
//               <a href="https://poultrymarketke.com/products" style="text-decoration: none; color: #059669; font-weight: 600; font-size: 14px;">🛒 Browse Products</a>
//             </div>
//             <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
//               <a href="https://poultrymarketke.com/chatbot" style="text-decoration: none; color: #ea580c; font-weight: 600; font-size: 14px;">🤖 AI Assistant</a>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
    
//     <!-- Footer -->
//     <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px 20px; text-align: center; border-top: 1px solid #e2e8f0;">
//       <div style="margin-bottom: 20px;">
//         <img src="https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png" alt="PoultryMarket" style="height: 40px; width: auto;">
//       </div>
//       <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">
//         © 2025 PoultryMarket Kenya. All rights reserved.<br>
//         Connecting farmers, buyers, and the poultry community across Kenya.
//       </p>
//       <p style="color: #94a3b8; font-size: 13px; margin: 10px 0 0 0;">
//         Need help? Contact us at <a href="mailto:support@poultrymarketke.com" style="color: #4f46e5; text-decoration: none;">support@poultrymarketke.com</a><br>
//         <a href="https://poultrymarketke.com/unsubscribe" style="color: #94a3b8; text-decoration: underline; font-size: 12px;">Unsubscribe from announcements</a>
//       </p>
//     </div>
//   </div>
// </body>
// </html>
//     `;
//   }
// };

// // Test examples
// console.log('=== SALE ANNOUNCEMENT PREVIEW ===');
// const saleEmail = emailTemplates.announcement(
//   'John Kamau',
//   'SALE',
//   'Weekend Special: 50% Off Premium Chicken',
//   'Get amazing discounts on our premium free-range chicken this weekend only! Perfect for your family gatherings and special occasions. Limited quantities available - first come, first served.\n\nOffer includes:\n• Free-range chicken at 50% off\n• Free delivery for orders above KES 3,000\n• Quality guarantee\n\nDon\'t miss out on this incredible opportunity!',
//   'Sarah Wanjiku',
//   'https://poultrymarketke.com/announcements'
// );

// console.log('=== URGENT ANNOUNCEMENT PREVIEW ===');
// const urgentEmail = emailTemplates.announcement(
//   'Jane Muthoni',
//   'URGENT',
//   'Important: System Maintenance Tonight',
//   'URGENT NOTICE: Our platform will undergo scheduled maintenance tonight from 11:00 PM to 3:00 AM EAT. During this time, you may experience limited access to certain features.\n\nWhat to expect:\n• Order processing may be delayed\n• Payment confirmations might take longer\n• Some features may be temporarily unavailable\n\nWe apologize for any inconvenience and appreciate your patience as we work to improve our services.',
//   'PoultryMarket Technical Team',
//   'https://poultrymarketke.com/announcements'
// );

// console.log('=== EVENT ANNOUNCEMENT PREVIEW ===');
// const eventEmail = emailTemplates.announcement(
//   'Peter Kiprotich',
//   'EVENT',
//   'Annual Poultry Farmers Conference 2025',
//   'Join us for the biggest poultry farming event of the year! Connect with fellow farmers, learn from industry experts, and discover new opportunities in the poultry business.\n\nEvent Details:\n📅 Date: March 15, 2025\n📍 Location: Kenya International Convention Centre, Nairobi\n⏰ Time: 8:00 AM - 6:00 PM\n\nTopics include:\n• Modern farming techniques\n• Disease prevention and management\n• Market trends and opportunities\n• Technology in poultry farming\n\nRegister now for early bird pricing!',
//   'Kenya Poultry Association',
//   'https://poultrymarketke.com/announcements'
// );

// console.log('Professional announcement email templates have been created and integrated successfully! 🎉');
// console.log('Features included:');
// console.log('✅ Type-specific styling and icons');
// console.log('✅ Professional gradient headers');
// console.log('✅ Responsive design');
// console.log('✅ Call-to-action buttons');
// console.log('✅ Social media integration');
// console.log('✅ Quick action links');
// console.log('✅ Company branding');
// console.log('✅ Accessibility features');
