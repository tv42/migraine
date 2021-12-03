# deno.land/x/migraine -- Simple Postgres schema management

```
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=pgdev
export PGDATABASE=postgres

deno run \
    --allow-env=PGHOST,PGPORT,PGUSER,PGPASSWORD,PGDATABASE,PGAPPNAME \
    --allow-net=localhost:5432 \
    --allow-read=/migrations,/secrets/pgformyapp \
    https://deno.land/x/migraine-postgres/migraine.ts \
    --migrations=/migrations \
    --auth=myapp=/secrets/pgformyapp
```

Put migrations in a separate directory, with names like `001_description_here.sql`.

Put Postgres role passwords each in a separate file.

## Features

- SQL schema migrations
- set passwords for Postgres roles
- usable both as a command-line tool and a library

## Ideals

- simple
- easily understandable
- robust

## Anti-goals

- databases other than Postgres, simpler code is better
- command to create a new file for a migration
- "down" migrations
