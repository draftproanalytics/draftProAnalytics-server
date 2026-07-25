import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import dotenv from 'dotenv';
/* ********************************************************
* userName: MS_fzm475@test-51ndgwvkooqlzqx8.mlsender.net
* userPswd: mssp.B2cDnE1.x2p03471jpk4zdrn.1cvBlW2
***********************************************************/

const mailerSend = new MailerSend({
    apiKey: process.env.API_KEY,
});

const sentFrom = new Sender("info@domain.com", "Your name");

const recipients = [
    new Recipient("recipient@email.com", "Your Client")
];

const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("This is a Subject")
    .setHtml("Greetings from the team, you got this message through MailerSend.")
    .setText("Greetings from the team, you got this message through MailerSend.");

await mailerSend.email.send(emailParams);