const express = require('express');
// const axios = require('axios')
const dotenv = require('dotenv')
const mysql = require('mysql2/promise')

dotenv.config()

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
        return res.status(400).send(`Error!! ${result.map(res => `${res.EmailID}`)} already have a meeting at the mentioned time`);
    }

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
    // Check if interview time is changed.
    let {id, participants, startTime, endTime} = req.body;
    participants = [...(new Set(participants))];
    const connection = await mysql.createConnection(dbConfig);

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
 
    // Get Email of participants to be added and participants to be deleted
    let shouldDelete = current.filter(email => {
        return !participantsEmail.includes(email);
    });

    console.log(shouldDelete);

    let newParticipants = participantsEmail.filter(email => {
        return !current.includes(email);
    });

    console.log(newParticipants);
    // update interview_user_relation
    if (shouldDelete.length) {
        await connection.execute(`DELETE FROM interview_user_relation WHERE userId IN (SELECT id FROM USERS WHERE EmailID IN (${shouldDelete.map(email => `'${email}'`)})) AND interviewId=${id}`);
    }
    
    for(let i = 0; i < newParticipants.length; i++) {
        console.log(newParticipants[i]);
        await connection.execute(`INSERT INTO interview_user_relation (interviewId, userId) VALUES (${id}, (SELECT id FROM USERS WHERE EmailID = '${newParticipants[i]}'))`);
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