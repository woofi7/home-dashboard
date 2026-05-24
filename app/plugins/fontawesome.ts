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
  faGripVertical,
  faSliders,
  faImage,
  faEye,
  faEyeSlash,
  faCalendarDays,
  faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons'

library.add(faXmark, faCheck, faPencil, faRotateLeft, faRotateRight, faRightFromBracket, faTableColumns, faGripVertical, faSliders, faImage, faEye, faEyeSlash, faCalendarDays, faArrowUpRightFromSquare)

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('FaIcon', FontAwesomeIcon)
})
