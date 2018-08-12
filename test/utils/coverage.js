#! /usr/bin/env node

const coberturaBadger = require('istanbul-cobertura-badger')
const fs = require('fs')
const path = require('path')

const opts = {
  badgeFileName: 'coverage',
  destinationDir: __dirname,
  istanbulReportFile: path.resolve(__dirname, '../../coverage', 'cobertura-coverage.xml'),
  thresholds: {
    excellent: 90, // overall percent >= excellent, green badge
    good: 60 // overall percent < excellent and >= good, yellow badge
    // overall percent < good, red badge
  }
}

// Load the badge for the report$
coberturaBadger(opts, function parsingResults(err, badgeStatus) {
  if (err) {
    console.log('An error occurred: ' + err.message)
  }

  const readme = path.resolve(__dirname, '../../README.md')
  const badgeUrl = badgeStatus.url // e.g. http://img.shields.io/badge/coverage-60%-yellow.svg

  // open the README.md and add this url
  fs.readFile(readme, {encoding: 'utf-8'}, (err, body) => {
    if (err) console.log(err.toString())

    body = body.replace(/(!\[coverage\]\()(.+?)(\))/g, (whole, a, b, c) => {
      return a + badgeUrl + c
    })

    fs.writeFile(readme, body, {encoding: 'utf-8'}, (err) => {
      if (err) console.log(err.toString())

      console.log('Coverage badge successfully added to ' + readme)
    })
  })
})