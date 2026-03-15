# Setup

## Prisma + Pg
- `npm i`
- Config the `.env`
- Creatae a NeonDB for Pgsql from neon.com
- Connect the db and copy the connection URL
- paste it in `.env` at DATABASE_URL field
- `npx prisma init`
- `npx prisma generate`
- `npx prisma db push`

## Better-Auth
- Go to https://better-auth.com/docs/installation
- Scroll Down and generate the api key 
- paste it in `.env`
- and put http://localhost:3000 in BETTER_AUTH_URL & NEXT_PUBLIC_API_URL

***Then ig you are good to go, let me know if somsething goes wrong***