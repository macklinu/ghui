import { TextAttributes } from '@opentui/core'
import spinners, { type SpinnerName } from 'cli-spinners'
import { useEffect, useState } from 'react'

export const Loading = ({ kind }: { kind: SpinnerName }) => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((frame) => frame + 1)
    }, spinners[kind].interval)
    return () => clearInterval(interval)
  }, [kind])

  return (
    <text attributes={TextAttributes.DIM}>
      {spinners[kind].frames[frame % spinners[kind].frames.length]}
    </text>
  )
}
