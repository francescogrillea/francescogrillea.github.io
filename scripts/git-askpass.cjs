#!/usr/bin/env node
// Git requests credentials through stdout; the token is never placed in a URL or argv.
process.stdout.write(/username/i.test(process.argv[2] || "") ? "x-access-token\n" : `${process.env.GITHUB_TOKEN || ""}\n`);
