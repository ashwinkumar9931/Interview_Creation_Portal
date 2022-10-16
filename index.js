const express = require('express');

const mailer_sender = require('./email_handler')
// const axios = require('axios')
// const dotenv = require('dotenv')
const mysql = require('mysql2/promise')

const nodemailer = require('nodemailer')

// dotenv.config()

const PORT = process.env.PORT || 3000
const app = express()

var allowCrossDomain = function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
};


app.use(express.json());
app.use(allowCrossDomain);


let dbConfig = {
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'my_db'
}


function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function formatDate(date) {
    return (
        [
        date.getFullYear(),
        padTo2Digits(date.getMonth() + 1),
        padTo2Digits(date.getDate()),
        ].join('-') +
        ' ' +
        [
        padTo2Digits(date.getHours()),
        padTo2Digits(date.getMinutes()),
        padTo2Digits(date.getSeconds()),
        ].join(':')
    );
}

let connection;

app.post("/interview", async (req, res) => {
    let { participants, title, startTime, endTime } = req.body;
    console.log(req.body);
    console.log(participants);
    participants = [...(new Set(participants))];

    console.log(participants);

    // Check for less than 2 participants
    if (participants.length < 2) {
        return res.status(400).send("Invalid meeting at-least 2 participants needed");
    }

    // Check if End time is greate than end Time
    let start = Date.parse(startTime);
    let end = Date.parse(endTime);

    if (end < start) {
        return res.status(400).send("Invalide meeting time constraints");
    }

    // Check for clashes
    let [results,] = await connection.execute(`
        SELECT * FROM 
        interview_user_relation LEFT JOIN interview ON interview_user_relation.interviewId = interview.id 
        WHERE interview_user_relation.userId IN (${participants.map(part => `${part.id}`)})
        AND '${startTime}' < interview.endTime AND '${endTime}' > interview.startTime;`);
    if (results.length) {
        let [result, ] = await connection.execute(`SELECT EmailID FROM USERS WHERE id IN (${results.map((res) => `'${res.userId}'`)})`);
        return res.status(400).send(`Error!!${result.map((res, idx) => (idx != result.length-1) ? ` ${res.EmailID}` : ` and ${res.EmailID}`)} already have a meeting at the mentioned time`);
    }

    // Interview Email Sending Funcationality
    let emails_users = ""
    console.log("---------Sending Mail-----------")
    for(let i=0;i<participants.length;i++){
        //code for sending mails
        if(i == participants.length-1){
            emails_users = emails_users + participants[i].EmailID
        }
        else{
            emails_users = emails_users + participants[i].EmailID + ", "
        }
    }
    console.log(emails_users)
    // code for sending mails
    let e_subject = `${title} [Scaler Interview Scheduled]`
    let text = `Hello User,\nYour Interview is Scheduled at ${startTime} .\n\nJoin Accordingly!\n\nScalar Academy`

    mailer_sender(emails_users, e_subject, text).catch(console.error())
    
    console.log("--------------------------------")


    // Insert in DB
    let [result, ] = await connection.execute(`INSERT INTO interview (title, startTime, endTime) VALUES ('${title}' , '${startTime}', '${endTime}')`);
    let interviewId = result.insertId;
    participants.forEach(async (part) => {
        let [result, ] = await connection.execute(`INSERT INTO interview_user_relation (interviewId, userId) VALUES (${interviewId}, ${part.id})`);
    });
    
    res.status(200).send('Interview Schedule Created');
});




app.get("/interview", async (req, res) => {
    let [result, ] = await connection.execute(`SELECT * FROM interview`);
    for(let i = 0; i < result.length; i++) {
        let [res, ] = await connection.execute(`SELECT * from USERS WHERE id IN (SELECT userId FROM interview_user_relation WHERE interviewId = ${result[i].id})`);
        result[i].participants = res;
        result[i].startTime = formatDate(new Date(result[i].startTime));
        result[i].endTime = formatDate(new Date(result[i].endTime));
    }
    return res.status(200).send(result);
});



app.put("/interview", async (req, res) => {

    let flag_of_time = 1 // initilally '0'  for time not changed

    // Check if interview time is changed.
    let {id, title, participants, startTime, endTime} = req.body;
    participants = [...(new Set(participants))];
    const connection = await mysql.createConnection(dbConfig);

    console.log(title)

    console.log(participants);

    // check if participants are less than 2
    if (participants.length < 2) {
        return res.status(400).send("Invalid meeting update request, at-least 2 participants needed");
    }

    // Check if End time is greate than end Time
    let start = Date.parse(startTime);
    let end = Date.parse(endTime);

    if (end < start) {
        return res.status(400).send("Invalide meeting time constraints");
    }

    // get old meeting time
    let [time,] = await connection.execute(`SELECT startTime, endTime from interview where id=${id}`)
    console.log("--------------------------")
    if(start == Date.parse(time[0].startTime) && end == Date.parse(time[0].endTime)){
        flag_of_time = 0
    }
    console.log(flag_of_time)
    console.log("--------------------------")


    // Check for clashes
    let [results,] = await connection.execute(`
    SELECT * FROM 
    interview_user_relation LEFT JOIN interview ON interview_user_relation.interviewId = interview.id 
    WHERE interview_user_relation.userId IN 
    (${participants.map(part => `${part.id}`)})
    AND '${startTime}' < interview.endTime AND '${endTime}' > interview.startTime AND interview.id <> ${id}`);

    if (results.length) {
        let [result, ] = await connection.execute(`SELECT EmailID FROM USERS WHERE id IN (${results.map((res) => `'${res.userId}'`)})`);
        return res.status(400).send(`Error!! ${result.map(res => `${res.EmailID}`)} already have a meeting at the mentioned time`);
    }
    
    // Update interview timings
    await connection.execute(`UPDATE interview SET startTime='${startTime}', endTime='${endTime}' WHERE id=${id}`);

    // Get participants currently present for the interview
    let [current, ] = await connection.execute(`SELECT EmailID FROM USERS WHERE id IN (SELECT userId FROM interview_user_relation WHERE interviewId=${id})`);
    current = current.map((cur) => cur.EmailID);

    let participantsEmail = participants.map((participant) => participant.EmailID);
    console.log(participantsEmail);


    // Get email of participants who are present in both the times
    let old_partcipants = current.filter(email => {
        return participantsEmail.includes(email) && current.includes(email);
    });

    let old_members = ""

    for(let i=0;i<old_partcipants.length;i++){
        if(i == old_partcipants.length-1){
            old_members = old_members + old_partcipants[i]
        }
        else{
            old_members = old_members + old_partcipants[i] + ", "
        }
    }
    console.log(("----------old Partcipants---------------"))
    console.log(old_members)
    console.log("-----------------------------------------")


 
    // Get Email of participants to be added and participants to be deleted
    let shouldDelete = current.filter(email => {
        return !participantsEmail.includes(email);
    });
    console.log(shouldDelete);

    // get List of deleted members
    let deleted_members = ""

    for(let i=0;i<shouldDelete.length;i++){
        if(i == shouldDelete.length-1){
            deleted_members = deleted_members + shouldDelete[i]
        }
        else{
            deleted_members = deleted_members + shouldDelete[i] + ", "
        }
    }
    console.log("-------------Deleted Members-------------")
    console.log(deleted_members)
    console.log("-----------------------------------------")


    // get list of new added participants
    let newParticipants = participantsEmail.filter(email => {
        return !current.includes(email);
    });

    console.log(newParticipants);
    // update interview_user_relation
    if (shouldDelete.length) {
        await connection.execute(`DELETE FROM interview_user_relation WHERE userId IN (SELECT id FROM USERS WHERE EmailID IN (${shouldDelete.map(email => `'${email}'`)})) AND interviewId=${id}`);
    }


    console.log("------------------added participants-----------------")
    let new_users = ""
    for(let i = 0; i < newParticipants.length; i++) {
        // console.log(newParticipants[i]);
        if(i==newParticipants.length-1){
            new_users = new_users + newParticipants[i]
        }
        else{
            new_users = new_users + newParticipants[i] +", "
        }
        
        await connection.execute(`INSERT INTO interview_user_relation (interviewId, userId) VALUES (${id}, (SELECT id FROM USERS WHERE EmailID = '${newParticipants[i]}'))`);
    }
    console.log(new_users)
    console.log("------------------------------------------------------------")



    /*
                    <----------------------------------- send mail functionality --------------------------------------------------------->

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
    */

    // For Deleted User:
    let e_subject = `${title} [Scaler Schedule]`
    // put OLD time here 
    let text = `Hello User,\nYou have been removed from the interview scheduled at : ${time[0].startTime} to ${time[0].endTime}\n\nThank You!\n\nScalar Academy`

    if(deleted_members!=""){
        // call mail
        mailer_sender(deleted_members, e_subject, text).catch(console.error())

    }

    // For New User
    e_subject = `${title} [Scaler Interview Scheduled]`
    text = `Hello User,\nYour Interview is Scheduled at ${startTime} .\n\nJoin Accordingly!\n\nScalar Academy`
    if(new_users!=""){
        //call mail
        mailer_sender(new_users, e_subject, text).catch(console.error())
        
    }

    // Time changed
    e_subject = `${title} [Scaler Interview Rescheduled]`
    text = `Hello User,\nYour Interview is Rescheduled at ${startTime} .\n\nJoin Accordingly!\n\nScalar Academy`

    if(flag_of_time && old_members!=""){
        // call mail function
        mailer_sender(old_members, e_subject, text).catch(console.error())
    }

    res.status(200).send("Updated interview schedule");
});




app.delete("/interview", async (req, res) => {
    let {id} = req.body;

    await connection.execute(`DELETE FROM interview_user_relation WHERE interviewId=${id}`);
    await connection.execute(`DELETE FROM interview WHERE id = ${id}`);

    res.status(200).send("Deleted");
});



app.get("/users", async (req, res) => {

    let [result, ] = await connection.execute(`SELECT * FROM USERS`);

    res.status(200).send(result);
});




async function run () {
    connection = await mysql.createConnection(dbConfig);
    app.listen(PORT);
    console.log("App listening at port - ", PORT);
}



run();
