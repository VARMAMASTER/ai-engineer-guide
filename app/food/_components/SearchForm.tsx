import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { MIN_QUERY_LENGTH } from '@/lib/food/search'

/**
 * The search box.
 *
 * A PLAIN `<form method="get" action="/food">`, and a server component. No
 * `onChange`, no debounce, no client state — so it works with JavaScript
 * switched off, it works while the service worker is serving a cached shell,
 * and the browser's own back button restores the query because the query lives
 * in the URL rather than in a hook.
 *
 * A live-as-you-type search would be nicer on a fast connection and would also
 * be the only way to reach this page. `/food?q=dal` being a real, shareable,
 * prerenderable URL is worth more than the keystroke latency.
 */

export interface SearchFormProps {
  query: string
}

export default function SearchForm({ query }: SearchFormProps) {
  return (
    <form method="get" action="/food" role="search" className="flex flex-col gap-2 md:flex-row">
      <label htmlFor="food-q" className="sr-only">
        Search foods
      </label>
      <Input
        id="food-q"
        type="search"
        name="q"
        defaultValue={query}
        placeholder="dal, idli, sambar, paneer…"
        autoComplete="off"
        minLength={MIN_QUERY_LENGTH}
        maxLength={80}
        enterKeyHint="search"
        // 44px minimum tap target, the same floor the rest of the app uses.
        className="min-h-11 flex-1"
      />
      <Button type="submit" variant="accent" className="min-h-11">
        Search
      </Button>
    </form>
  )
}
