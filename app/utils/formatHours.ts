// Convert 24-hour HH:MM to 12-hour format (07:30 → 7:30 AM)
export const formatTime = (time24: string): string => {
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${period}`
}

// Format hours object for display
export const formatOperatingHours = (hoursData: any) => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  return days.map((day, index) => {
    const hours = hoursData?.[day]
    if (!hours || hours === 'closed') {
      return { name: day, label: labels[index], hours: 'Closed' }
    }
    
    const [open, close] = hours.split('-')
    return {
      name: day,
      label: labels[index],
      hours: `${formatTime(open)} - ${formatTime(close)}`
    }
  })
}

// Demo data fallback
export const demoHours = {
  monday: "07:30-17:00",
  tuesday: "07:30-17:00",
  wednesday: "07:30-17:00",
  thursday: "07:30-17:00",
  friday: "07:30-17:00",
  saturday: "07:30-17:00",
  sunday: "07:30-17:00"
}

// Demo languages
export const demoLanguages = ['English', 'Spanish', 'French', 'German']

// Demo description
export const demoDescription = `Our dive center is one of the longest established in the region, offering lush underwater gardens, colourful fishes and magnificent seascapes.

We tend to our underwater environments with the recent introduction of our Coral Gardening Project, which guests can take part in too.

Our facility features spacious air-conditioned classrooms, a comprehensive library, hot water showers, and secure equipment storage rooms.

The equipment we employ includes internationally-reputed brands such as Mares, Scubapro, Aqua Lung, Dive Rite and Suunto.

Please contact the dive center upon your arrival to book your diving program.`

