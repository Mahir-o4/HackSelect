import nodemailer from "nodemailer";
import pLimit from "p-limit";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_APP_PASSWORD
    }
})

export const sendBulkEmails = async (participants: { email: string; name: string }[]) => {
    const limit = pLimit(5)

    const results = await Promise.all(
        participants.map((p) => 
            limit(() =>
                transporter.sendMail({
                    from: `"HackSelect" <${process.env.NODEMAILER_USER}>`,
                    to: p.email,
                    subject: "You are accepted",
                    html: `<p>Hi ${p.name}, welcome to the hackathon!</p>`,
                })
            )
        )
    )

    return results;
}