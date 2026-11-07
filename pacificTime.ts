const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit",
  day: "2-digit", hour: "2-digit", hourCycle: "h23",
});

export function pacificDate(time: number) {
  const parts = Object.fromEntries(clock.formatToParts(time).map(({type, value}) => [type, Number(value)]));
  return {date: new Date(Date.UTC(parts.year, parts.month - 1, parts.day)), hour: parts.hour};
}

// The input carries the calendar date in UTC, without a time of day.
export function pacificMidnight(date: Date) {
  const seven = date.getTime() + 7 * 3600000;
  return pacificDate(seven).hour === 0 ? seven : seven + 3600000;
}

export function nextPacificMidnight(time: number) {
  const {date} = pacificDate(time);
  date.setUTCDate(date.getUTCDate() + 1);
  return pacificMidnight(date);
}
