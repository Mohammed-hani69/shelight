export interface Review {
  id: string
  productId: string
  author: string
  rating: number
  title: string
  body: string
  verified: boolean
  date: string
  helpful: number
}

export interface DoctorReview {
  id: string
  doctorName: string
  specialty: string
  quote: string
  avatar?: string
}

export interface ClientReview {
  id: string
  name: string
  rating: number
  text: string
  product?: string
}
