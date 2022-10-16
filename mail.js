const nodemailer = require('nodemailer')
// checking email working or not
async function mailer_sender(participants, startTime){

    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: "scalerinterview9931@gmail.com",
            pass: "ipkkjwmuprdqhgtq"
        }
    });

    const mailOptions = {
        from: 'Scalar Interview <scalerinterview9931@gmail.com>', // Sender address
        to: participants.concat(), // List of recipients
        subject: 'Scaler Interview Scheduled', // Subject line
        text: `Your Interview is Scheduled at ${startTime} .\nJoin Accordingly !\n\nScalar Academy`, // Plain text body
    };

    await transporter.sendMail(mailOptions);
}

const participants = ['ashwinkumar9931@gmail.com', '2019038@iiitdmj.ac.in', 'ashwinkumar9351@gmail.com']

const startTime = "10/16/2022 11.20 PM"

mailer_sender(participants, startTime).catch(console.error())



// async function mailer_sender(participants, startTime, endTime, flag){

//     let transporter = nodemailer.createTransport({
//         host: "smtp.gmail.com",
//         port: 465,
//         secure: true,
//         auth: {
//             user: "scalerinterview9931@gmail.com",
//             pass: "ipkkjwmuprdqhgtq"
//         }
//     });

//     let e_text  = `Your Interview is Scheduled at ${startTime} to ${endTime} .\nJoin Accordingly !\n\nScalar Academy`
//     let e_subject = 'Scaler Interview Scheduled'

//     if(!flag){
//         e_text  = `Your Interview is now Rescheduled at ${startTime} .\nJoin Accordingly !\n\nScalar Academy`
//         e_subject = 'Interview Rescheduled'
//     }

//     const mailOptions = {
//         from: 'Scalar Interview <scalerinterview9931@gmail.com>', // Sender address
//         to: participants.concat(), // List of recipients
//         subject: e_subject, // Subject line
//         text: e_text, // Plain text body
//     };
   
//     await transporter.sendMail(mailOptions);
// }