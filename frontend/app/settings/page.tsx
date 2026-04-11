'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SettingsModal from '@/components/SettingsModal'

export default function SettingsPage() {
  const router = useRouter()
  return (
    <SettingsModal
      isOpen={true}
      onClose={() => router.push('/')}
    />
  )
}
