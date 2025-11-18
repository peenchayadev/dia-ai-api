import dayjs from "dayjs"
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import duration from 'dayjs/plugin/duration'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(customParseFormat)
dayjs.extend(buddhistEra)
dayjs.locale('th')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)
dayjs.tz.setDefault('Asia/Bangkok')

export default dayjs
