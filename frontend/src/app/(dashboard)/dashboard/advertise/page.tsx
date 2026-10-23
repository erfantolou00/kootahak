import AdvertiseForm from "@/components/dashboard/advertise/AdvertiseForm";

export default function AdvertisePage() {
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-y-5">
        <span className="text-token-4xl font-token-bold">ثبت تبلیغات</span>
      </div>
      <AdvertiseForm />
    </div>
  );
}
