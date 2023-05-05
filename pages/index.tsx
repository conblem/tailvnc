import Head from 'next/head'
import { Inter } from 'next/font/google'
import dynamic from "next/dynamic";
import styles from '@/styles/Home.module.css'

const inter = Inter({ subsets: ['latin'] })

// we load this with ssr false as it does not support server side rendering
const VNC = dynamic(() => import('@/components/vnc').then(mod => mod.VNC), {ssr: false});

export default function Home() {
  return (
    <>
      <Head>
        <title>tailvnc</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
          <VNC host='100.72.98.51' />
      </main>
    </>
  )
}
