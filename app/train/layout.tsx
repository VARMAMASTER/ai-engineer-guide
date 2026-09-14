import TrainNav from './TrainNav'

/**
 * The Train app's frame: the section strip, and nothing else.
 *
 * A layout rather than three copies of the same import, so a fourth section is
 * one line in `sections.ts`. It deliberately adds no surface of its own — the
 * pages underneath own their panels, and a wrapper panel here would put every
 * page's glass inside another piece of glass.
 */
export default function TrainLayout({ children }: LayoutProps<'/train'>) {
  return (
    <>
      <TrainNav />
      {children}
    </>
  )
}
