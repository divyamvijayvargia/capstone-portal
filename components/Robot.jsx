import React, { Suspense } from 'react';

const Spline = React.lazy(() => import('@splinetool/react-spline'));

export default function Robot() {
    return (
        <div>
            <Suspense fallback={<div>Loading...</div>}>
                <Spline
                    scene="https://prod.spline.design/JX6rL7Qn3twyRiAh/scene.splinecode"
                />
            </Suspense>
        </div>
    );
}