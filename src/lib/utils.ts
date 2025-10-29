export function cn(
  ...inputs: Array<string | false | null | undefined | Record<string, boolean | undefined | null>>
) {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) {
      continue;
    }

    if (typeof input === 'string') {
      classes.push(input);
      continue;
    }

    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(' ');
}
