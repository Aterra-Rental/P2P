import React from 'react'
import '../Global.css'
import '../Feature/Feature.css'
const Feature = () => {
  return (
    <div className='Global '>
       <h1 className=' text-center'>Our Features</h1>
      <section className='For-box w-100 h-50 gap-1 mx-auto grid grid-cols-6 sm:grid-cols-1 lg:grid-cols-6 mt-5 ' >
           <div className='box  w-[230px] h-[230px] text-center'>
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Secure Transactions</h3>
              <p>Every transactioon is recorded and verified to ensure your safety</p>
           </div>
           <div className='box w-[230px] h-[230px] text-center'>
             <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Room-Based Trading</h3>
              <p> Creae private rooms and invite others to trade in a secure space.</p>
           </div>
           <div className='box  w-[230px] h-[230px] text-center'>
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Real-Time Chat</h3>
            <p>Communication with your trading partner instantly within the room.</p>
           </div>
           <div className='box  w-[230px] h-[230px] text-center'>
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Payment Verification</h3>
            <p>Auto verified payment by bot</p>
           </div>
           <div className='box  w-[230px] h-[230px] text-center'>
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Transaction Tracking</h3>
            <p>Track the status of your transaction from the start to finish</p>
           </div>
           <div className='box  w-[230px] h-[230px] text-center' >
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>User Ratings</h3>
            <p>Rate and review users after each sucessful transaction</p>
           </div>
      </section>



      <h1 className='text-center mt-5'>How it Works</h1>
      <section className='For-box w-full h-50 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 mt-5'>
        <div className='boxf  w-[230px] h-[230px] text-center'>
            
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Create Room</h3>
              <p>Create a trading room.</p>
           </div>
           <div className='boxf w-[230px] h-[230px] text-center'>
            
             <h3 className=' text-black  fs-4 pt-3 fw-bolder'>invite Partner</h3>
              <p>Invite your partner into your room and choose role(Buyer or Seller)</p>
           </div>
           <div className='boxf  w-[230px] h-[230px] text-center'>
            
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Comfirm money amount</h3>
            <p>Bth parties have to comfirm the money amount</p>
           </div>
           <div className='boxf  w-[230px] h-[230px] text-center'>
           
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Deposite and hold</h3>
            <p>Buyer deposites money and hold</p>
           </div>
           <div className='boxf  w-[230px] h-[230px] text-center'>
            
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>Deal</h3>
            <p>Buyer and seller come to a deal and buyer releases the money to seller</p>
           </div>
           <div className='boxf  w-[230px] h-[230px] text-center' >
            
            <h3 className=' text-black  fs-4 pt-3 fw-bolder'>User Ratings</h3>
            <p>Rate and review users after each sucessful transaction</p>
           </div>
      </section>


      <section className=' w-full h-[400px] flex justify-center gap-3 mt-5'>
        <div className=' Big-box bg-dark'>
           <h1 className=' text-center mt-2'>Security You Can Trust</h1>
           <div className='grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 for-mini-box gap-0 p-0 m-0'>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
           </div>
        </div>
        <div className=' Big-box bg-dark '>
          <h1 className=' text-center mt-2'>Security You Can Trust</h1>
           <div className='grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 for-mini-box gap-0 p-0 m-0'>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
            <div className='mini-box'>g</div>
           </div>
        </div>
      </section>

    </div>
  )
}

export default Feature