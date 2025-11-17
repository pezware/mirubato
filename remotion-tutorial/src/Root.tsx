import { Composition } from 'remotion'
import { MirubatoIntro } from './MirubatoIntro'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MirubatoIntro"
        component={MirubatoIntro}
        durationInFrames={4290} // 143 seconds at 30fps (8+15+30+25+25+30+10)
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  )
}
