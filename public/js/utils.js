// public/js/utils.js

export function formatPlaceName(real_name, fictional_name) {
  if (real_name && fictional_name) {
    return `${real_name} / ${fictional_name}`;
  } else if (real_name) {
    return real_name;
  } else if (fictional_name) {
    return fictional_name;
  } else {
    return '';
  }
}
