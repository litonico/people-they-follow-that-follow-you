import { peopleTheyFollowThatFollowYou } from "./rando_score"
import express from "express"

const port = 9292
const app = express()

app.get('/', async (req, res) => {
  async function getLinks(forUser: string) {
    const people = await peopleTheyFollowThatFollowYou(forUser)
    return people.map(user => `
      <div>
        <a href=http://twitter.com/${user.screen_name}> ${user.name} (@${user.screen_name})</a>
      </div>
    `).join('')
  }

  const forUser = req.query.userName
  if (typeof forUser !== "string") {
    res.send(`
      <html>
        <head>
          <style>
            html *
            {
              font-family: Helvetica;
            }
          </style>
        </head>
        <body>
          <h3>People They Follow That Follow You</h3>
          <form>
            <input type=text name="userName"/>
            <input type=submit />
          </form>
          </div>
        </body>
      </html>
    `)
  } else {
    res.send(`<html>
        <head>
          <style>
            html *
            {
              font-family: Helvetica;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
        <h3>People They Follow That Follow You</h3>
          ${await getLinks(forUser)}
        </body>
      </html>
  `)
  }
})

app.listen(port, () => console.log(`app running on ${port}`))
