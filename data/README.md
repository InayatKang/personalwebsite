# How to update dynamic sections

Edit these JSON files — the site loads them automatically:

## Current Orbit — `data/orbit.json`
Each item: category, title, description, status, updated (YYYY-MM-DD), optional link.

Categories: "Building" | "Researching" | "Studying" | "Reading"

## Mission Log — `data/mission-log.json`
Each entry: id, date, title, image, description, link, linkLabel

## Reading Log — `data/reading.json`
- `goodreads`: URL for the View Goodreads button
- books: title, author, cover (path under img/reading/), note

Add book cover images to `img/reading/` when available.
