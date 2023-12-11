import nodemailer from 'nodemailer';

export interface IEmailOptions {
  email: string;
  subject: string;
  message: string;
}

const secureOption = process.env.NODE_ENV === 'production' ? true : false;

export const sendEmail = async (options: IEmailOptions) => {
  const mailConfig = {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: secureOption,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  };

  // create a transporter (service that will send the email)
  const transporter = nodemailer.createTransport(mailConfig);

  // define email options
  const mailOptions = {
    from: 'Luthfia from Natours <luthfia@natours.id>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // send the email
  await transporter.sendMail(mailOptions);
};
