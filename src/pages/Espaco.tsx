import { Calendar, Laptop } from 'lucide-react'
import { useState } from 'react'
import { PageHeader, Tabs } from '../components/ui'
import { Aulas } from './Aulas'
import { Equipamentos } from './Equipamentos'

type Vista = 'aulas' | 'equipamentos'

export function Espaco() {
  const [vista, setVista] = useState<Vista>('aulas')

  return (
    <div>
      <PageHeader title="Espaço" subtitle="Aulas na biblioteca e utilização de equipamentos." />

      <Tabs
        value={vista}
        onChange={setVista}
        options={[
          { value: 'aulas', label: 'Aulas na biblioteca', icon: <Calendar className="size-3.5" /> },
          { value: 'equipamentos', label: 'Equipamentos', icon: <Laptop className="size-3.5" /> },
        ]}
      />

      {vista === 'aulas' ? <Aulas /> : <Equipamentos />}
    </div>
  )
}
