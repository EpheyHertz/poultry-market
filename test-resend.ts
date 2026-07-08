import { Resend } from "resend";

const resend = new Resend("test");

async function test() {
  await resend.emails.send({
    from: "Acme <onboarding@example.com>",
    to: "test@example.com",
    subject: "Hello",
    html: "<h1>Hello</h1>",
  });
}