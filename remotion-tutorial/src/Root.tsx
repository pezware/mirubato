import { Composition } from 'remotion'
import { MirubatoIntro } from './MirubatoIntro'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MirubatoIntro"
        component={MirubatoIntro}
        durationInFrames={1950} // 65 seconds at 30fps (5+10+18+12+15+5) - optimized for 2x speed
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  )
}
