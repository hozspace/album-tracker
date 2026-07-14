import { APP_NAME } from '../config'

export function TopBar() {
  return (
    <header className="page-meta">
      <span className="page-meta__app-name">{APP_NAME}</span>
    </header>
  )
}
