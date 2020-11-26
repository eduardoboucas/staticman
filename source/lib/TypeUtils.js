export default function assertString(value, message = `${value} is not a string`) {
  if (typeof value !== 'string') {
    throw new TypeError(message);
  }
}
