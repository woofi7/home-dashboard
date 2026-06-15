import { config, library } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'

config.autoAddCss = false
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faXmark,
  faCheck,
  faPencil,
  faRotateLeft,
  faRotateRight,
  faRightFromBracket,
  faTableColumns,
  faTableCells,
  faGripVertical,
  faSliders,
  faImage,
  faEye,
  faEyeSlash,
  faCalendarDays,
  faArrowUpRightFromSquare,
  faGear,
  faCloudSun,
  faCloudSunRain,
  faChevronLeft,
  faChevronDown,
  faFileZipper,
  faSpinner,
  faDownload,
  faUpload,
  faFolderOpen,
  faCircleExclamation,
  faFile,
  faMagnifyingGlass,
  faChevronUp,
  faServer,
  faPlus,
  faTrash,
  faKey,
  faBus,
  faTicket,
} from '@fortawesome/free-solid-svg-icons'

library.add(faXmark, faCheck, faPencil, faRotateLeft, faRotateRight, faRightFromBracket, faTableColumns, faTableCells, faGripVertical, faSliders, faImage, faEye, faEyeSlash, faCalendarDays, faArrowUpRightFromSquare, faGear, faCloudSun, faCloudSunRain, faChevronLeft, faChevronDown, faChevronUp, faFileZipper, faSpinner, faDownload, faUpload, faFolderOpen, faCircleExclamation, faFile, faMagnifyingGlass, faServer, faPlus, faTrash, faKey, faBus, faTicket)

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('FaIcon', FontAwesomeIcon)
})
