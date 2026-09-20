import App from '@/components/App';
export default async function Page({params}:{params:Promise<{code:string}>}){const {code}=await params;return <App page="join" inviteCode={code}/>;}
