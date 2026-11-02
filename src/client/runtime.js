export let React
export let h

export function bindRuntime(require) {
  React = require('react')
  h = React.createElement
}
