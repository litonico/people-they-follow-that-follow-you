import Twitter from 'twitter-lite'
import { inspect } from 'util'

process.on('unhandledRejection', error => {
  if (error instanceof Error) {
    console.log('unhandledRejection:', error.message);
  } else {
    console.log('unhandledRejection of something that was not an error', inspect(error));
  }
});

// TODO(lito): sleeping for the rate-limited time is good, but we can also hit
// cases where we call many twitter APIs in a row and hit the ratelimit by
// accident. query the ratelimit api and use that value instead.

// NOTE(lito): this single function is copied verbatim from gary. rights his
function requireEnvVar(key: string): string {
  const value = process.env[key]

  if (value === undefined) {
    throw new Error(`${key} environment variable isn't set`)
  } else {
    return value
  }
}

const client = new Twitter({
  subdomain: "api",
  version: "1.1",
  consumer_key: requireEnvVar("TWITTER_CONSUMER_KEY"),
  consumer_secret: requireEnvVar("TWITTER_CONSUMER_SECRET"),
  access_token_key: requireEnvVar("TWITTER_ACCESS_TOKEN"),
  access_token_secret: requireEnvVar("TWITTER_ACCESS_SECRET"),
});

type TwitterUser = {
  name: string
  screen_name: string
}

const ratelimitSeconds = 60
const myUsername = requireEnvVar("TWITTER_USERNAME")
const twitterCursorStart = -1

async function sleep(seconds: number) {
  console.log(`(sleeping for ${seconds}s)`)
  await new Promise(resolve => setTimeout(resolve, 1000 * seconds))
}

async function paginate(callback: (x: number) => Promise<{ids: string[], next_cursor: number}>): Promise<string[]> {
  let cursor: number = twitterCursorStart
  let ids: string[] = []
  let terminate = false
  do {
    const batch = await callback(cursor)
    cursor = batch.next_cursor
    ids = ids.concat(batch.ids)
    terminate = cursor === 0
    if (!terminate) {
      await sleep(ratelimitSeconds)
    }
  } while (!terminate)
  return ids
}

async function friends(forUsername: string): Promise<string[]> {
  return paginate(async function (cursor: number) {
    const result = await client.get("friends/ids", {
      screen_name: forUsername,
      stringify_ids: true,
      cursor,
    })
    return result
  })
}

async function followers(forUsername: string): Promise<string[]> {
  return paginate(async function (cursor: number) {
    const result = await client.get("followers/ids", {
      screen_name: forUsername,
      stringify_ids: true,
      cursor,
    })
    return result
  })
}

async function lookupUsers(ids: string[]) {
  if (ids.length > 100) {
    throw new Error("You're very famous. This person knows you well.")
  }
  return await client.get("users/lookup", {
    user_id: ids.join(",")
  }) as TwitterUser[]
}

export async function peopleTheyFollowThatFollowYou(theirUsername: string): Promise<TwitterUser[]> {
  const theyFollow = new Set(await friends(theirUsername))
  const followYou = await followers(myUsername)
  const ids = followYou.filter((x: string) => theyFollow.has(x));
  return await lookupUsers(ids)
}
