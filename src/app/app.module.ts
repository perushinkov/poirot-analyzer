import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NewRouteComponent } from './routing/new-route/new-route.component';
import { ImportRouteComponent } from './routing/import-route/import-route.component';
import { InitRouteComponent } from './routing/init-route/init-route.component';
import { LayoutRouteComponent } from './routing/layout-route/layout-route.component';
import { AboutRouteComponent } from './routing/about-route/about-route.component';
import { ModalModule } from 'ngx-bootstrap';
import { LocalForageModule } from 'ngx-localforage';

@NgModule({
  declarations: [
    AppComponent,
    NewRouteComponent,
    ImportRouteComponent,
    InitRouteComponent,
    LayoutRouteComponent,
    AboutRouteComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ModalModule.forRoot(),
    LocalForageModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
