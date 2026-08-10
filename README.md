# Passr: Your Ticket Price Authority

Build a mobile app called Passr — a price-checking and analysis app for

resale event tickets (concerts, sports, theater).

BRAND

- Colors: black (#000000), white (#FFFFFF), purple (#53437C) as the primary accent

- Font: League Spartan (bold, lowercase wordmark "passr")

- Tone: clean, minimal, trustworthy — not flashy or cluttered

CORE CONCEPT

Passr helps people find the true lowest price for a ticket across resale

marketplaces (StubHub, SeatGeek, Vivid Seats, Ticketmaster), see whether

a price is a good deal relative to recent market averages, and check

whether a listing looks legitimate — all before they buy. Passr never

takes credit for purchases it didn't influence and never manipulates

pricing or referral links; it only reads and displays information.

SCREENS TO BUILD

1. Search / Home

   - Search bar for an artist, team, or event

   - Recent/trending events as tappable cards

   - Each result card shows event name, date, venue, and "starting at $X"

2. Event Detail

   - Event name, date, venue, artist/team image

   - Section/seat picker (simple dropdown or list is fine)

   - "Out-the-door price" comparison: a list of marketplaces (StubHub,

     SeatGeek, Vivid Seats, Ticketmaster) each showing total price

     including fees, sorted cheapest to most expensive, with the

     cheapest one visually highlighted

   - "Market value" module: a single large number showing the 30-day

     average price for this section, with a badge showing whether the

     current cheapest price is above or below that average (green for

     below average / good deal, purple for above average)

   - "Listing check" module: a short reassurance line confirming the

     listing pattern looks legitimate, with a small checkmark icon

   - "Splitting with friends?" module: a stepper to select number of

     people (1–10) that live-recalculates and displays price per person

3. Watchlist / Alerts

   - List of events the user has saved

   - Each shows current cheapest price and a small up/down trend

     indicator since they saved it

   - Simple toggle for "notify me if price drops"

4. Simple onboarding (2–3 screens max)

   - What Passr does, emphasize "we just show you the real price,

     nothing hidden"

DATA

Use realistic mock/placeholder data for now — plausible artist names,

venues, dates, and prices in the $40–$400 range with fees between 15–25%

of base price. No real API integration needed yet.

DESIGN DIRECTION

Minimal, generous white space, black headers with white text on key

action screens, purple used sparingly as the accent (badges, active

states, buttons) rather than as a dominant background color. Avoid

gradients, avoid excessive card shadows, keep typography confident and

large for prices specifically since that's the core value the app

delivers.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/18773124-a5e2-41c2-bbf2-f92c6525e4e9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
