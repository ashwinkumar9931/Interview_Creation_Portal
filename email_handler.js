
const express = require('express');
// const axios = require('axios')
// const dotenv = require('dotenv')
const mysql = require('mysql2/promise')

const nodemailer = require('nodemailer')

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "scalerinterview9931@gmail.com",
        pass: "ipkkjwmuprdqhgtq"
    }
});

// Mail Meeting Handler ------------ send mail funcationality added ---------------
async function mailer_sender(participants, e_subject, e_text){

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
        from: `Scalar Interview <scalerinterview9931@gmail.com>`, // Sender address
        to: participants.concat(), // List of recipients
        subject: e_subject, // Subject line
        text: e_text, // Plain text body
    };
   
    await transporter.sendMail(mailOptions);
}

module.exports = mailer_sender;


/* 

case 1: New meeting is created

    e_subject = 'Scaler Interview Scheduled'
    text = `Your Interview is Scheduled at ${startTime} .\nJoin Accordingly !\n\nScalar Academy`

case 2: Meeting is Edited

        {
            variables->
                deleted_members = [""]
                new_users = [""]
                flag = true/false   (Time changed or Not)

            1) only time has been changed
                    -> case 1: Users have been removed
                    -> case 2: Users have been added
                    -> case 3: No one is added or removed

            2) no time have been changed
                    -> case 1: Users have been added
                    -> case 2: users have been removed
        }

        For removed user: 
        e_subject = 'Scaler Schedule'
        text = `Hello User,\nYou have been removed form the interview scheduled at : ${startTime}\nThank You !\n\nScalar Academy`


        For new_User:
        e_subject = 'Scaler Interview Scheduled'
        text = `Hello User,\nYour Interview is Scheduled at ${startTime} .\nJoin Accordingly !\n\nScalar Academy`


        For Old User but different Time:
        e_subject = 'Scaler Interview Rescheduled'
        text = `Hello User,\nYour Interview is Rescheduled at ${startTime} .\nJoin Accordingly !\n\nScalar Academy`


case 3: Meeting is Deleted

        e_subject = 'Scheduled Interview Deleted'

        text = `Hello User,\nThere will not be any interview scheduled at ${startTime} .\nThank You !\n\nScalar Academy`

*/
