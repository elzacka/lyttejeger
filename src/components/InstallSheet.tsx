import { Sheet } from './Sheet'
import { getDeviceInfo, type DeviceInfo } from '../utils/deviceDetection'
import styles from './InstallSheet.module.css'

interface InstallSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function InstallSheet({ isOpen, onClose }: InstallSheetProps) {
  const deviceInfo = getDeviceInfo()

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Installer Lyttejeger">
      <div className={styles.container}>
        <p className={styles.intro}>
          Installer appen for raskere tilgang og bedre opplevelse.
        </p>

        <InstallInstructions deviceInfo={deviceInfo} />
      </div>
    </Sheet>
  )
}

function InstallInstructions({ deviceInfo }: { deviceInfo: DeviceInfo }) {
  const { os, browser, deviceType } = deviceInfo

  // iOS instructions
  if (os === 'ios') {
    if (browser === 'safari') {
      return (
        <div className={styles.instructions}>
          <h3 className={styles.heading}>Safari på iPhone/iPad</h3>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">ios_share</span>
              </span>
              <span>Trykk på <strong>Del</strong>-knappen i verktøylinjen</span>
            </li>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">add_box</span>
              </span>
              <span>Velg <strong>Legg til på Hjem-skjerm</strong></span>
            </li>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">check</span>
              </span>
              <span>Trykk <strong>Legg til</strong> for å bekrefte</span>
            </li>
          </ol>
        </div>
      )
    }

    // iOS but not Safari
    return (
      <div className={styles.instructions}>
        <div className={styles.warning}>
          <span className="material-symbols-outlined">info</span>
          <p>
            For å installere appen på iOS må du bruke <strong>Safari</strong>.
            Åpne denne siden i Safari og følg instruksjonene.
          </p>
        </div>
      </div>
    )
  }

  // Android instructions
  if (os === 'android') {
    if (browser === 'chrome') {
      return (
        <div className={styles.instructions}>
          <h3 className={styles.heading}>Chrome på Android</h3>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">more_vert</span>
              </span>
              <span>Trykk på <strong>menyknappen</strong> (tre prikker)</span>
            </li>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">add_to_home_screen</span>
              </span>
              <span>Velg <strong>Installer app</strong> eller <strong>Legg til på startskjermen</strong></span>
            </li>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">check</span>
              </span>
              <span>Trykk <strong>Installer</strong> for å bekrefte</span>
            </li>
          </ol>
        </div>
      )
    }

    if (browser === 'samsung') {
      return (
        <div className={styles.instructions}>
          <h3 className={styles.heading}>Samsung Internet</h3>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">menu</span>
              </span>
              <span>Trykk på <strong>menyknappen</strong> (tre linjer)</span>
            </li>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">add_box</span>
              </span>
              <span>Velg <strong>Legg til side på</strong> → <strong>Startskjerm</strong></span>
            </li>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">check</span>
              </span>
              <span>Trykk <strong>Legg til</strong> for å bekrefte</span>
            </li>
          </ol>
        </div>
      )
    }

    // Other Android browsers
    return (
      <div className={styles.instructions}>
        <h3 className={styles.heading}>Android</h3>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepIcon}>
              <span className="material-symbols-outlined">more_vert</span>
            </span>
            <span>Åpne nettlesermenyen</span>
          </li>
          <li>
            <span className={styles.stepIcon}>
              <span className="material-symbols-outlined">add_to_home_screen</span>
            </span>
            <span>Se etter <strong>Installer</strong> eller <strong>Legg til på startskjermen</strong></span>
          </li>
        </ol>
        <div className={styles.tip}>
          <span className="material-symbols-outlined">lightbulb</span>
          <p>For best opplevelse anbefaler vi Chrome eller Samsung Internet.</p>
        </div>
      </div>
    )
  }

  // Desktop instructions
  if (deviceType === 'desktop') {
    if (browser === 'chrome' || browser === 'edge') {
      return (
        <div className={styles.instructions}>
          <h3 className={styles.heading}>
            {browser === 'chrome' ? 'Chrome' : 'Edge'} på {os === 'macos' ? 'Mac' : os === 'windows' ? 'Windows' : 'desktop'}
          </h3>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">install_desktop</span>
              </span>
              <span>Klikk på <strong>installer-ikonet</strong> i adressefeltet (til høyre)</span>
            </li>
            <li>
              <span className={styles.stepIcon}>
                <span className="material-symbols-outlined">check</span>
              </span>
              <span>Klikk <strong>Installer</strong> i dialogboksen</span>
            </li>
          </ol>
          <p className={styles.note}>
            Appen åpnes i eget vindu og legges til i programmenyen.
          </p>
        </div>
      )
    }

    // Desktop browsers that don't support installation
    return (
      <div className={styles.instructions}>
        <div className={styles.warning}>
          <span className="material-symbols-outlined">info</span>
          <p>
            Din nettleser støtter ikke app-installasjon direkte.
            Bruk <strong>Chrome</strong> eller <strong>Edge</strong> for å installere appen.
          </p>
        </div>
      </div>
    )
  }

  // Fallback for unknown devices
  return (
    <div className={styles.instructions}>
      <p className={styles.note}>
        For å installere appen, se etter «Installer» eller «Legg til på startskjerm»
        i nettleserens meny.
      </p>
    </div>
  )
}
