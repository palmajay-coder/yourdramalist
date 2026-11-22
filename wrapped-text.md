<!--
This file holds the words on each MyDramaList Wrapped slide. Edit the words freely, then save (commit) it.
The site picks them up on its next deploy (the build copies this file into wrappedText.ts).

How to edit:
- Each line is   name: words
  Change only the words after the colon. Keep the name before the colon exactly as it is.
- Lines starting with ## are just headings to help you find a slide. They are not shown to anyone.
- **text** makes text bold.
- Words in {curly brackets} are filled in from each person's list. Keep them spelled exactly as they are:
    {country}   a country name, shown in bold
    {genre}     a genre name, shown in bold
    {name}      an actor's name, shown in bold
    {cast}      the #1 title's two lead actors, shown in bold ("Lee Min-ho and Kim Go-eun")
    {list}      what was completed, shown in bold numbers ("23 dramas and 56 movies")
    {title1} {title2}  two of their titles from that country (their top rated), shown in italics
    {watched}   "42 titles watched!" in bold
    {countries} the tied countries, shown in bold ("Japan and South Korea")
    {average}   the average score, counted up on screen
    {count}     just the number, in bold (also {days} and {hours} where they're used)
- A number with a word after it is written like this:   {count|title|titles}
  It shows the number in bold, then the first word when the number is 1 and the second word otherwise
  ("1 title", "31 titles"). The name before the first | is the number to use: count, days or hours.
- If you delete a line by mistake, that piece of text just won't show. Copy it back from GitHub's history.
- MyDramaList doesn't share watch dates, so don't promise anything about "this year" or when something was watched.
-->

## 1. Opening
opening.headline: You've watched the dramas. Now here's the drama.
opening.line: Here's everything you've completed so far from then to 2026.

## 2. Completed
completed.story: That's a whole lot of drama.
completed.line: You didn't just start {list}. You finished every single one.
completed.one: You didn't just start it. You finished it.

## 3. Watch time
time.story: Time well spent. Or was it?
time.days: That's {days|day|days} nonstop, fueled by snacks, tissues and zero regrets.
time.hours: That's {hours|hour|hours} nonstop, fueled by snacks, tissues and zero regrets.

## 4. Top genre (one line per genre; "other" is used for any genre not listed)
genre.story: You clearly have a type.
genre.Thriller: {count|thriller|thrillers} in, and you still never trust the nice guy.
genre.Romance: {count|love story|love stories}, and your heart still falls for every confession.
genre.Comedy: {count|comedy|comedies} in, and you're still laughing at the same jokes.
genre.Mystery: {count|mystery|mysteries}, and you still can't resist a good whodunit.
genre.Crime: {count|crime story|crime stories} in, and you could probably pass the detective exam.
genre.Action: {count|action title|action titles}, and not one fight scene too many.
genre.Action & Adventure: {count|action-packed adventure|action-packed adventures}, and not one fight scene too many.
genre.Adventure: {count|adventure|adventures}, and you're always up for the next journey.
genre.Fantasy: {count|fantasy story|fantasy stories}, and you're always ready for another world.
genre.Sci-Fi & Fantasy: {count|otherworldly story|otherworldly stories}, and you're always ready for another world.
genre.Science Fiction: {count|sci-fi story|sci-fi stories}, and the future has never looked more dramatic.
genre.Horror: {count|horror title|horror titles}, and you still watched with the lights on. Probably.
genre.Family: {count|family story|family stories}, and every one hit close to home.
genre.History: {count|historical story|historical stories}, and you've practically lived through every dynasty.
genre.War: {count|war story|war stories}, and every one left its mark.
genre.War & Politics: {count|story|stories} of war and power, and every one left its mark.
genre.Music: {count|music story|music stories}, and the soundtrack never left your head.
genre.Animation: {count|animated story|animated stories}, proof that big feelings come in every style.
genre.Documentary: {count|documentary|documentaries}, because real life has the best drama.
genre.other: {count|title|titles} of {genre}, and you know exactly what you like.

## 5. Countries (one line for the #1 country: expression, two of their titles, a remark about the country; countries.clear is only the fallback)
countries.story: Your passport to drama.
countries.line.South Korea: Aigoo! From {title1} to {title2}, you've officially mastered the art of K-drama marathons with {watched}
countries.line.Japan: Sugoi! From {title1} to {title2}, you're living the J-drama life with {watched}
countries.line.China: Tài bàng le! From {title1} to {title2}, you've explored the C-drama universe with {watched}
countries.line.Thailand: Sud yot! From {title1} to {title2}, you've dived headfirst into Thai drama with {watched}
countries.line.Taiwan: Hǎo kàn! From {title1} to {title2}, you've fallen for Taiwanese drama charm with {watched}
countries.line.Hong Kong: Waa! From {title1} to {title2}, you've soaked up the Hong Kong drama magic with {watched}
countries.line.Philippines: Ang galing! From {title1} to {title2}, you've embraced Filipino drama with {watched}
countries.line.other: Wow! From {title1} to {title2}, you've traveled the world of {country} dramas with {watched}
countries.clear: {country} practically took over your watchlist, with {count|title|titles}.
countries.tie: {countries} tied at {count} each, because choosing favorites isn't your thing.

## 6. Eras (by release decade; the big "The 2020s" under the headline is filled in from their list)
eras.story: Every era has its drama, yours was:
eras.line: Dramas from this decade **dominated** your watchlists.
eras.tie: Dramas from these decades **dominated** your watchlists equally.

## 7. Most-watched actor
actor.headline: Your most-watched actor is {name}.
actor.line: {count|title|titles} in, it's official: {name} has a fan, and it's you.
actor.one: One title in, and {name} already has a fan: you.

## 8. Your #1 drama and #1 movie
topDrama.story: Some dramas hit different.
topMovie.story: Some movies hit different.
top.withCast: Of everything you've finished, this one with {cast} hit hardest.
top.noCast: Of everything you've finished, this one hit hardest.

## 9. Ratings
ratings.headline: Your average score is {average}.
ratings.tens: Out of everything you watched, you gave {count|title|titles} a perfect 10!
ratings.generous: You believe in giving credit where the drama is due.
ratings.tough: No perfect 10s yet, because you don't hand out stars easily. Every point here was earned.
ratings.balanced: No perfect 10s yet, just an honest score for every hit and every miss.

## 10. Drama personality
personality.story: Your drama personality revealed.
personality.romantic.name: The Hopeless Romantic
personality.romantic.line: You're in it for the slow burns, the umbrella moments and the confessions in the rain. **Romance** is your love language, and honestly? We'd swoon too.
personality.thriller.name: The Thriller Addict
personality.thriller.line: You live for **the twist**. You trust no one, you suspect everyone, and you saw that betrayal coming three episodes early. Sleep can wait.
personality.hopper.name: The Genre Hopper
personality.hopper.line: Your taste refuses to be boxed in. One night it's a rom-com, the next it's a revenge saga, and somehow it all makes sense. That's **range**.
personality.marathoner.name: The Drama Marathoner
personality.marathoner.line: "One more episode" is never just one. You stay with a story all the way to the final credits, then press play on the next. That kind of **stamina** deserves an award.
personality.fan.name: The Drama Fan
personality.fan.line: Some nights you cry, some nights you laugh, and you always come back for more. Dramas are part of your **everyday**, and that's what true fans are made of.

## 11. Summary and share picture
summary.headline: That's a wrap. But the drama never ends.
